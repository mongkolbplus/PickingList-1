import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ErpError,
  calcSessionProgress,
  localCloseBox,
  localConfirmNextPackingDocument,
  localRemoveItemFromBox,
  localScan,
  localUndoLastScan,
  parseBarcodeInput,
  th,
  type ScanSession,
} from '@scan-goods/shared';
import {
  activeDocumentRef,
  canCheckNextPackingDocument,
  documentsForParty,
} from '@scan-goods/shared/utils/packingSessionUtils';
import {
  aggregateCurrentBoxLines,
  formatWeight,
} from '@scan-goods/shared/utils/boxUtils';
import {
  aggregateSessionItems,
  formatQty,
  statusBadgeTone,
} from '@scan-goods/shared/utils/scanItemUtils';
import {
  formatShippingAddress,
  hasShippingAddressContent,
  resolveDisplayShippingAddress,
} from '@scan-goods/shared/utils/shippingAddressUtils';
import { resolveScanRequirements } from '@scan-goods/shared/utils/serialLotUtils';
import { usePackingStore } from '../store/packingStore';
import { loadLatestSessionSnapshot } from '../services/database';
import { BARCODE_SCAN_TYPES } from '../constants/barcodeScan';
import { AppButton } from './AppButton';
import { Card } from './Card';
import { QtyStepper } from './QtyStepper';
import { SerialLotCapture } from './SerialLotCapture';
import { StatusBadge, type StatusTone } from './StatusBadge';
import { colors, minTouch, radius } from '../theme/colors';

type ScanTab = 'doc' | 'items' | 'box';
type NoticeTone = 'success' | 'error' | 'warn' | 'info';

function toneToBadge(tone: ReturnType<typeof statusBadgeTone>): StatusTone {
  if (tone === 'done') return 'ok';
  if (tone === 'partial') return 'warn';
  return 'muted';
}

function noticeColor(tone: NoticeTone) {
  switch (tone) {
    case 'success':
      return colors.ok;
    case 'error':
      return colors.danger;
    case 'warn':
      return colors.warn;
    default:
      return colors.info;
  }
}

export function PackingScanView() {
  const session = usePackingStore((s) => s.session);
  const restoreSession = usePackingStore((s) => s.restoreSession);
  const updateSession = usePackingStore((s) => s.updateSession);
  const pauseSession = usePackingStore((s) => s.pauseSession);

  const [barcode, setBarcode] = useState('');
  const [scanQty, setScanQty] = useState(1);
  const [scanWeight, setScanWeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<NoticeTone>('info');
  const [activeTab, setActiveTab] = useState<ScanTab>('items');
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanningRef = useRef(false);
  const [captureMode, setCaptureMode] = useState<'lot' | 'serial' | null>(null);
  const [pendingScan, setPendingScan] = useState<{
    barcode: string;
    multiplier: number;
    weightGrams?: number;
    goodsCode: string;
    skuName: string;
  } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (session) {
        if (mounted) setReady(true);
        return;
      }
      const snap = await loadLatestSessionSnapshot();
      if (snap) await restoreSession(snap);
      if (mounted) setReady(true);
    }
    void init();
    return () => {
      mounted = false;
    };
  }, [session, restoreSession]);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace('/(tabs)/documents');
      return;
    }
    if (session.status === 'confirmed') {
      router.replace('/packing/print');
    }
  }, [ready, session]);

  if (!ready || !session) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>กำลังโหลด session...</Text>
      </View>
    );
  }

  const activeDoc = activeDocumentRef(session);
  const activePartyDocs = documentsForParty(
    session,
    session.activePartyCode ?? activeDoc?.partyCode,
  );
  const shippingAddress = resolveDisplayShippingAddress(session);
  const itemLines = aggregateSessionItems(session);
  const boxLines = aggregateCurrentBoxLines(session);
  const progress = calcSessionProgress(session);
  const partyDocRefs = activePartyDocs.map((doc) => doc.diRef).join(', ');

  const notify = async (message: string, tone: NoticeTone) => {
    setNotice(message);
    setNoticeTone(tone);
    if (tone === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (tone === 'error' || tone === 'warn') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const run = async (action: () => void | Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      await notify(
        error instanceof ErpError ? error.message : th.scan.genericError,
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const parseScanWeightGrams = (raw: string) => {
    const normalized = raw.trim().replace(/,/g, '');
    if (!normalized) return undefined;
    const value = Number(normalized);
    if (!Number.isFinite(value) || value <= 0) return undefined;
    return value;
  };

  const performScan = async (
    activeSession: ScanSession,
    scan: {
      barcode: string;
      multiplier: number;
      weightGrams?: number;
      lotNo?: string;
      serialNo?: string;
    },
  ) => {
    const result = localScan(activeSession, {
      barcode: scan.barcode,
      multiplier: scan.multiplier,
      boxNo: activeSession.currentBoxNo,
      weightGrams: scan.weightGrams,
      lotNo: scan.lotNo,
      serialNo: scan.serialNo,
    });
    setBarcode('');
    setScanQty(1);
    setScanWeight('');
    await updateSession(result.session);
    await notify(th.scan.scanSuccess(result.currentBoxNo), 'success');
  };

  const submitScan = async (rawValue?: string) => {
    if (scanningRef.current) return;
    const raw = (rawValue ?? barcode).trim();
    const parsed = parseBarcodeInput(raw);
    if (!parsed.barcode) return;

    const multiplier = parsed.multiplier > 1 ? parsed.multiplier : scanQty;
    const weightGrams = parseScanWeightGrams(scanWeight);
    const requirements = resolveScanRequirements(session, parsed.barcode);

    if (!requirements) {
      scanningRef.current = true;
      try {
        await run(async () => {
          await performScan(session, {
            barcode: parsed.barcode,
            multiplier,
            weightGrams,
          });
        });
      } finally {
        scanningRef.current = false;
      }
      return;
    }

    if (requirements.needsSerial) {
      setPendingScan({
        barcode: parsed.barcode,
        multiplier: 1,
        weightGrams,
        goodsCode: requirements.goodsCode,
        skuName: requirements.skuName,
      });
      setCaptureMode('serial');
      return;
    }

    if (requirements.needsLot) {
      setPendingScan({
        barcode: parsed.barcode,
        multiplier,
        weightGrams,
        goodsCode: requirements.goodsCode,
        skuName: requirements.skuName,
      });
      setCaptureMode('lot');
      return;
    }

    scanningRef.current = true;
    try {
      await run(async () => {
        await performScan(session, {
          barcode: parsed.barcode,
          multiplier,
          weightGrams,
        });
      });
    } finally {
      scanningRef.current = false;
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('ต้องการสิทธิ์กล้อง', 'เปิดสิทธิ์กล้องเพื่อสแกนบาร์โค้ด');
        return;
      }
    }
    setShowCamera(true);
  };

  const renderDocTab = () => (
    <ScrollView style={styles.panelScroll} contentContainerStyle={styles.panelContent}>
      <Text style={styles.panelTitle}>{th.scan.docInfo}</Text>
      <InfoRow label={th.scan.customer} value={
        activeDoc?.partyCode
          ? `${activeDoc.partyCode}${activeDoc.partyName ? ` — ${activeDoc.partyName}` : ''}`
          : (activeDoc?.partyName ?? '-')
      } />
      <InfoRow
        label={th.scan.docRef}
        value={
          activePartyDocs.length > 1
            ? th.scan.multiDocs(activePartyDocs.length, partyDocRefs)
            : (activeDoc?.diRef ?? '-')
        }
      />
      <InfoRow label={th.scan.date} value={activeDoc?.diDate ?? '-'} />
      <InfoRow label={th.scan.lines} value={String(itemLines.length)} />
      <Text style={styles.sectionTitle}>{th.scan.shippingAddress}</Text>
      {shippingAddress && hasShippingAddressContent(shippingAddress) ? (
        formatShippingAddress(shippingAddress).map((line) => (
          <Text key={line} style={styles.shippingLine}>{line}</Text>
        ))
      ) : (
        <Text style={styles.muted}>{th.scan.noShippingAddress}</Text>
      )}
    </ScrollView>
  );

  const renderItemsTab = () => (
    <FlatList
      data={itemLines}
      keyExtractor={(item) => item.lineKey}
      style={styles.panelScroll}
      contentContainerStyle={styles.panelContent}
      ListHeaderComponent={
        <Text style={styles.panelTitle}>
          {th.scan.remainingTitle} ({itemLines.length})
        </Text>
      }
      renderItem={({ item }) => (
        <Card style={styles.lineCard}>
          <Text style={styles.lineCode}>{item.barcode} · {item.skuCode}</Text>
          <Text style={styles.lineName}>{item.skuName}</Text>
          <Text style={styles.lineMeta}>
            {item.unitName} · บรรจุ {formatQty(item.packSize)} · {item.sourceDiRef}
          </Text>
          <View style={styles.lineStats}>
            <Text style={styles.stat}>ตามเอกสาร {formatQty(item.documentQty)}</Text>
            <Text style={styles.stat}>สแกน {formatQty(item.scanQty)}</Text>
            <Text style={styles.stat}>คงเหลือ {formatQty(item.remainingQty)}</Text>
            <StatusBadge label={item.status} tone={toneToBadge(statusBadgeTone(item.status))} />
          </View>
        </Card>
      )}
    />
  );

  const renderBoxTab = () => (
    <ScrollView style={styles.panelScroll} contentContainerStyle={styles.panelContent}>
      <Text style={styles.panelTitle}>{th.scan.boxTitle} #{session.currentBoxNo}</Text>
      {boxLines.length === 0 ? (
        <Text style={styles.muted}>{th.scan.emptyBox}</Text>
      ) : (
        boxLines.map((line) => (
          <Card key={line.rowKey} style={styles.lineCard}>
            <View style={styles.boxRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineCode}>{line.goodsCode}</Text>
                <Text style={styles.lineMeta}>
                  {formatQty(line.totalQty)} · {formatWeight(line.totalWeight)} ก.
                </Text>
              </View>
              <AppButton
                title={th.scan.remove}
                variant="secondary"
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    const item = session.items.find(
                      (i) =>
                        i.goodsCode === line.goodsCode &&
                        i.boxNo === session.currentBoxNo,
                    );
                    if (!item) return;
                    await updateSession(
                      localRemoveItemFromBox(session, item.itemId).session,
                    );
                    await notify(th.scan.removedFromBox, 'warn');
                  })
                }
              />
            </View>
          </Card>
        ))
      )}
      <View style={styles.boxActions}>
        <AppButton
          title={th.scan.closeBox}
          disabled={busy}
          onPress={() =>
            void run(async () => {
              const result = localCloseBox(session);
              await updateSession(result.session);
              await notify(
                th.scan.closeBoxSuccess(result.closedBoxNo, result.nextBoxNo),
                'success',
              );
            })
          }
        />
        <AppButton
          title={th.scan.nextCustomer}
          variant="secondary"
          disabled={busy || !canCheckNextPackingDocument(session)}
          onPress={() =>
            void run(async () => {
              const result = localConfirmNextPackingDocument(session);
              await updateSession(result.session);
              if (result.isLastDocument) {
                await notify(
                  th.scan.lastCustomerDone(
                    result.document.partyCode ?? result.document.diRef,
                  ),
                  'success',
                );
              } else {
                await notify(
                  th.scan.nextCustomerSuccess(
                    result.document.partyCode ?? '',
                    result.document.partyName,
                    result.document.diRef,
                  ),
                  'success',
                );
              }
              setActiveTab('items');
            })
          }
        />
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{th.scan.eyebrow}</Text>
          <Text style={styles.summary}>
            {th.scan.currentBox} #{session.currentBoxNo} · {th.scan.remainingLines}{' '}
            {itemLines.length}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <AppButton
            title={th.scan.pause}
            variant="secondary"
            disabled={busy}
            onPress={() => void pauseSession()}
          />
          <AppButton
            title={th.scan.closeJob}
            variant="danger"
            disabled={busy}
            onPress={() => router.push('/packing/confirm')}
          />
        </View>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>
            {progress.scannedQty} / {progress.documentQty} {th.scan.progressUnit}
          </Text>
          <Text style={styles.progressPct}>{progress.percent}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
        </View>
      </View>

      <View style={styles.tabs}>
        {([
          ['doc', th.scan.tabDoc],
          ['items', `${th.scan.tabItems} (${itemLines.length})`],
          ['box', `${th.scan.tabBox} #${session.currentBoxNo}`],
        ] as const).map(([tab, label]) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.panel}>
        {activeTab === 'doc' ? renderDocTab() : null}
        {activeTab === 'items' ? renderItemsTab() : null}
        {activeTab === 'box' ? renderBoxTab() : null}
      </View>

      <View style={styles.dock}>
        <Text style={styles.scanTitle}>{th.scan.scanTitle}</Text>
        <View style={styles.scanRow}>
          <TextInput
            style={styles.scanInput}
            value={barcode}
            onChangeText={setBarcode}
            onSubmitEditing={() => void submitScan()}
            placeholder={th.scan.scanPlaceholder}
            placeholderTextColor={colors.muted}
            editable={!busy}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
          <Pressable style={styles.cameraBtn} onPress={() => void openCamera()} disabled={busy}>
            <Text style={styles.cameraBtnText}>📷</Text>
          </Pressable>
        </View>
        <View style={styles.scanControls}>
          <View style={styles.weightWrap}>
            <Text style={styles.controlLabel}>{th.scan.weightLabel}</Text>
            <TextInput
              style={styles.weightInput}
              value={scanWeight}
              onChangeText={(text) => setScanWeight(text.replace(/[^\d.,]/g, ''))}
              placeholder={th.scan.weightPlaceholder}
              inputMode="decimal"
              editable={!busy}
            />
          </View>
          <QtyStepper
            value={scanQty}
            onChange={setScanQty}
            disabled={busy}
            label={th.scan.qtyLabel}
          />
          <AppButton
            title={th.scan.save}
            disabled={busy || !barcode.trim()}
            onPress={() => void submitScan()}
          />
          <AppButton
            title={th.scan.undo}
            variant="secondary"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await updateSession(localUndoLastScan(session).session);
                await notify(th.scan.undoSuccess, 'warn');
              })
            }
          />
        </View>
        {notice ? (
          <Text style={[styles.notice, { color: noticeColor(noticeTone) }]}>{notice}</Text>
        ) : null}
      </View>

      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: BARCODE_SCAN_TYPES }}
            onBarcodeScanned={({ data }) => {
              if (scanningRef.current) return;
              setShowCamera(false);
              void submitScan(data);
            }}
          />
          <View style={styles.cameraFooter}>
            <AppButton
              title="ปิดกล้อง"
              variant="secondary"
              onPress={() => setShowCamera(false)}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {pendingScan ? (
        <SerialLotCapture
          mode={captureMode}
          session={session}
          goodsCode={pendingScan.goodsCode}
          skuName={pendingScan.skuName}
          qty={pendingScan.multiplier}
          onCancel={() => {
            setCaptureMode(null);
            setPendingScan(null);
          }}
          onConfirmLot={(lotNo) => {
            const scan = pendingScan;
            setCaptureMode(null);
            setPendingScan(null);
            void run(async () => {
              await performScan(session, {
                barcode: scan.barcode,
                multiplier: scan.multiplier,
                weightGrams: scan.weightGrams,
                lotNo,
              });
            });
          }}
          onConfirmSerial={(serialNo) => {
            const scan = pendingScan;
            setCaptureMode(null);
            setPendingScan(null);
            void run(async () => {
              await performScan(session, {
                barcode: scan.barcode,
                multiplier: 1,
                weightGrams: scan.weightGrams,
                serialNo,
              });
            });
          }}
        />
      ) : null}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  loadingText: { color: colors.muted },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  eyebrow: { fontSize: 12, color: colors.muted },
  summary: { fontSize: 16, fontWeight: '700', color: colors.ink },
  headerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { color: colors.ink, fontWeight: '600' },
  progressPct: { color: colors.accent, fontWeight: '700' },
  progressTrack: {
    height: 8,
    backgroundColor: colors.bgAccent,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: 4,
  },
  tabActive: { backgroundColor: colors.infoBg },
  tabText: { fontSize: 12, color: colors.muted, fontWeight: '600', textAlign: 'center' },
  tabTextActive: { color: colors.accent },
  panel: { flex: 1, marginHorizontal: 16 },
  panelScroll: { flex: 1 },
  panelContent: { paddingBottom: 16, gap: 8 },
  panelTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 8 },
  infoRow: { marginBottom: 8 },
  infoLabel: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  infoValue: { fontSize: 15, color: colors.ink },
  shippingLine: { fontSize: 14, color: colors.ink, marginBottom: 2 },
  muted: { color: colors.muted },
  lineCard: { marginBottom: 0 },
  lineCode: { fontWeight: '700', color: colors.ink },
  lineName: { color: colors.ink, marginTop: 2 },
  lineMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  lineStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8 },
  stat: { fontSize: 13, color: colors.ink },
  boxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boxActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  dock: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.panel,
    padding: 12,
    gap: 8,
  },
  scanTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  scanRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  scanInput: {
    flex: 1,
    minHeight: minTouch,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: '#fff',
  },
  cameraBtn: {
    width: minTouch,
    height: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtnText: { fontSize: 22 },
  scanControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'flex-end',
  },
  weightWrap: { minWidth: 100 },
  controlLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 4 },
  weightInput: {
    minHeight: 36,
    minWidth: 90,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    fontSize: 15,
    backgroundColor: '#fff',
    color: colors.ink,
  },
  notice: { fontSize: 13, fontWeight: '600' },
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraFooter: { padding: 16, backgroundColor: colors.bg },
});
