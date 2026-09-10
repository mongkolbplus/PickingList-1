import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  buildBoxLabelPrintDataList,
  buildPackingListPrintDataList,
  formatDocumentRefRange,
  getAvailableBoxNos,
  getDocumentRefsForBox,
  LABELS_PER_A4_PAGE,
  LABEL_TEMPLATE_LABEL,
  PACKING_TEMPLATE_OPTIONS,
  renderBoxLabelsHtml,
  renderPackingListsHtml,
  th,
  type PackingTemplateId,
  type PrintSettings,
} from '@scan-goods/shared';
import { AppButton } from './AppButton';
import { AppDropdown } from './AppDropdown';
import { Card } from './Card';
import { useAuthStore } from '../store/authStore';
import { usePackingStore } from '../store/packingStore';
import { upsertJobFromSession } from '../services/jobStorage';
import {
  addPrintHistory,
  listPrintHistory,
  type PrintHistoryEntry,
} from '../services/printHistory';
import {
  loadPrintSettings,
  resolvePrintSettingsForOrg,
  savePrintSettings,
} from '../services/printSettings';
import { colors, minTouch, radius } from '../theme/colors';
import type { ScanSession } from '@scan-goods/shared';

type PreviewKind = 'label' | 'packing';
type RightPanelTab = 'preview' | 'history';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('th-TH');
  } catch {
    return iso;
  }
}

async function printHtml(html: string) {
  await Print.printAsync({ html });
}

async function sharePdf(html: string) {
  const file = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri);
  } else {
    Alert.alert('สำเร็จ', `บันทึกไฟล์ที่ ${file.uri}`);
  }
}

const LABEL_PREVIEW_FIT_SCRIPT = `
(function () {
  function fitLabelPreview() {
    var page = document.querySelector('.a4-label-page--default');
    var root = document.querySelector('.print-root');
    if (!page || !root) return;
    root.style.transform = '';
    root.style.transformOrigin = '';
    root.style.marginBottom = '';
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var pageWidth = page.getBoundingClientRect().width;
    if (pageWidth <= 0 || pageWidth <= vw) return;
    var scale = (vw - 4) / pageWidth;
    root.style.transform = 'scale(' + scale + ')';
    root.style.transformOrigin = 'top center';
    root.style.marginBottom = ((page.scrollHeight * scale) - page.scrollHeight) + 'px';
  }
  window.addEventListener('load', fitLabelPreview);
  window.addEventListener('resize', fitLabelPreview);
  setTimeout(fitLabelPreview, 120);
})();
true;
`;

function enhancePreviewHtml(html: string, kind: PreviewKind) {
  if (kind !== 'label') return html;
  return html.replace(
    '</body>',
    `<script>${LABEL_PREVIEW_FIT_SCRIPT}<\/script></body>`,
  );
}

interface PrintViewProps {
  session: ScanSession;
}

export function PrintView({ session }: PrintViewProps) {
  const org = useAuthStore((s) => s.org);
  const username = useAuthStore((s) => s.username);
  const [copies, setCopies] = useState('1');
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedBoxes, setSelectedBoxes] = useState<number[]>([]);
  const [previewPage, setPreviewPage] = useState(0);
  const [previewKind, setPreviewKind] = useState<PreviewKind>('label');
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('preview');
  const [settings, setSettings] = useState<PrintSettings | null>(null);
  const [history, setHistory] = useState<PrintHistoryEntry[]>([]);

  const availableBoxes = useMemo(() => getAvailableBoxNos(session), [session]);

  useEffect(() => {
    void (async () => {
      const next = await resolvePrintSettingsForOrg(org?.company, org?.branch);
      setSettings(next);
    })();
  }, [org?.company, org?.branch]);

  useEffect(() => {
    setSelectedBoxes(availableBoxes);
    setPreviewPage(0);
  }, [session.sessionId, availableBoxes.join(',')]);

  const historyRef = useMemo(() => {
    const selectedBoxList = selectedBoxes
      .filter((boxNo) => availableBoxes.includes(boxNo))
      .sort((a, b) => a - b);
    return formatDocumentRefRange(
      selectedBoxList.flatMap((boxNo) => getDocumentRefsForBox(session, boxNo)),
    );
  }, [availableBoxes, selectedBoxes, session]);

  useEffect(() => {
    void (async () => {
      const docRef = historyRef !== '-' ? historyRef : session.documents[0]?.diRef;
      setHistory(await listPrintHistory(docRef));
    })();
  }, [historyRef, session.documents, session.sessionId]);

  const selectedBoxList = selectedBoxes
    .filter((boxNo) => availableBoxes.includes(boxNo))
    .sort((a, b) => a - b);

  const copiesNum = Math.max(1, Number(copies) || 1);

  const packingDataList = selectedBoxList.length
    ? buildPackingListPrintDataList(session, selectedBoxList)
    : [];

  const labelDataList = selectedBoxList.length
    ? buildBoxLabelPrintDataList(session, selectedBoxList, org ?? undefined)
    : [];

  const labelPages: Array<typeof labelDataList> = [];
  for (let i = 0; i < labelDataList.length; i += LABELS_PER_A4_PAGE) {
    labelPages.push(labelDataList.slice(i, i + LABELS_PER_A4_PAGE));
  }

  const expandedLabelList = Array.from({ length: copiesNum }, () => labelDataList).flat();

  const labelHtml = labelDataList.length && settings
    ? renderBoxLabelsHtml(
        expandedLabelList,
        settings.labelTemplateId,
        settings.labelPrinterName,
      )
    : '';

  const packingHtml = packingDataList.length && settings
    ? renderPackingListsHtml(
        packingDataList,
        settings.packingTemplateId,
        settings.a4PrinterName,
      )
    : '';

  const previewHtml = useMemo(() => {
    if (!settings) return '';
    let html = '';
    if (previewKind === 'label') {
      if (labelPages[previewPage]?.length) {
        html = renderBoxLabelsHtml(
          labelPages[previewPage],
          settings.labelTemplateId,
          settings.labelPrinterName,
        );
      } else {
        html = labelHtml;
      }
    } else if (packingDataList[previewPage]) {
      html = renderPackingListsHtml(
        [packingDataList[previewPage]],
        settings.packingTemplateId,
        settings.a4PrinterName,
      );
    } else {
      html = packingHtml;
    }
    return enhancePreviewHtml(html, previewKind);
  }, [
    labelHtml,
    labelPages,
    packingDataList,
    packingHtml,
    previewKind,
    previewPage,
    settings,
  ]);

  const persistSettings = useCallback(
    async (patch: Partial<PrintSettings>) => {
      if (!settings) return;
      const stored = await loadPrintSettings();
      const next = {
        ...stored,
        ...settings,
        ...patch,
        orgKey: `${org?.company ?? '-'}|${org?.branch ?? '-'}`,
      };
      await savePrintSettings(next);
      setSettings(next);
    },
    [org?.branch, org?.company, settings],
  );

  const refreshHistory = useCallback(async () => {
    const docRef = historyRef !== '-' ? historyRef : session.documents[0]?.diRef;
    setHistory(await listPrintHistory(docRef));
  }, [historyRef, session.documents]);

  const markPrinted = useCallback(
    async (action: string, detail?: string) => {
      await upsertJobFromSession(
        { ...session, workflowStatus: th.workflow.printed },
        {
          workflowStatus: th.workflow.printed,
          action,
          detail,
          packerName: username ?? undefined,
        },
      );
    },
    [session, username],
  );

  const recordHistory = useCallback(
    async (type: 'label' | 'packing', title: string, html: string, templateId: string) => {
      await addPrintHistory({
        type,
        title,
        documentRef:
          historyRef !== '-' ? historyRef : (session.documents[0]?.diRef ?? '-'),
        boxNos: selectedBoxList,
        copies: type === 'label' ? copiesNum : 1,
        printerProfile: 'a4',
        templateId,
        html,
        user: username ?? undefined,
      });
      await refreshHistory();
    },
    [copiesNum, historyRef, refreshHistory, selectedBoxList, session.documents, username],
  );

  const toggleBox = (boxNo: number) => {
    setSelectedBoxes((current) =>
      current.includes(boxNo)
        ? current.filter((value) => value !== boxNo)
        : [...current, boxNo],
    );
    setPreviewPage(0);
  };

  const selectAllBoxes = () => {
    setSelectedBoxes([...availableBoxes]);
    setPreviewPage(0);
  };

  const clearBoxes = () => {
    setSelectedBoxes([]);
    setPreviewPage(0);
  };

  const printLabels = async () => {
    if (!settings) return;
    if (!selectedBoxList.length) {
      setNotice(th.print.selectBoxRequired);
      return;
    }
    if (!labelHtml) {
      setNotice(th.print.noLabelData);
      return;
    }
    try {
      await printHtml(labelHtml);
      await recordHistory(
        'label',
        th.print.labelDocTitle(historyRef),
        labelHtml,
        settings.labelTemplateId,
      );
      await markPrinted(
        th.jobActions.printLabel,
        th.print.historyBoxes(selectedBoxList.join(', '), copiesNum),
      );
      setNotice(
        selectedBoxList.length === availableBoxes.length
          ? th.print.printedAll(selectedBoxList.length)
          : th.print.printedSome(selectedBoxList.length),
      );
    } catch (error) {
      Alert.alert('พิมพ์ไม่สำเร็จ', error instanceof Error ? error.message : String(error));
    }
  };

  const printPackingList = async () => {
    if (!settings) return;
    if (!packingHtml || !packingDataList.length) {
      setNotice(th.print.noPackingData);
      return;
    }
    const packingRef = formatDocumentRefRange(
      packingDataList.map((entry) => entry.document.diRef),
    );
    try {
      await printHtml(packingHtml);
      await recordHistory(
        'packing',
        th.print.packingDocTitle(packingRef),
        packingHtml,
        settings.packingTemplateId,
      );
      await markPrinted(
        th.jobActions.printPacking,
        th.print.historyBoxesAll(selectedBoxList.join(', ')),
      );
      setNotice(th.print.packingPrinted);
    } catch (error) {
      Alert.alert('พิมพ์ไม่สำเร็จ', error instanceof Error ? error.message : String(error));
    }
  };

  const downloadPdf = async (type: PreviewKind) => {
    const html = type === 'label' ? labelHtml || previewHtml : packingHtml;
    if (!html) {
      setNotice(th.print.noPdf);
      return;
    }
    try {
      await sharePdf(html);
      setNotice(th.print.pdfHint);
    } catch (error) {
      Alert.alert('ดาวน์โหลด PDF ไม่สำเร็จ', error instanceof Error ? error.message : String(error));
    }
  };

  const reprint = async (entry: PrintHistoryEntry) => {
    try {
      await printHtml(entry.html);
      await markPrinted(th.jobActions.reprint, entry.title);
      setNotice(th.print.reprint(entry.title));
    } catch (error) {
      Alert.alert('พิมพ์ซ้ำไม่สำเร็จ', error instanceof Error ? error.message : String(error));
    }
  };

  if (!settings) {
    return (
      <Card>
        <Text style={styles.loadingText}>กำลังโหลดการตั้งค่า...</Text>
      </Card>
    );
  }

  const orgHint = org ? ` · ${org.company} / ${org.branch}` : '';

  return (
    <View style={styles.root}>
      <Text style={styles.lede}>
        {th.print.layoutHint}
        {orgHint}
      </Text>

      <Card>
        <View style={styles.boxHeader}>
          <Text style={styles.sectionTitle}>
            {th.print.selectBoxes} ({selectedBoxList.length}/{availableBoxes.length})
          </Text>
          <View style={styles.boxActions}>
            <Pressable onPress={selectAllBoxes} style={styles.linkBtn}>
              <Text style={styles.linkText}>{th.print.allBoxes}</Text>
            </Pressable>
            <Pressable onPress={clearBoxes} style={styles.linkBtn}>
              <Text style={styles.linkText}>{th.print.clear}</Text>
            </Pressable>
          </View>
        </View>

        {availableBoxes.length ? (
          availableBoxes.map((boxNo) => {
            const boxMeta = session.boxes.find((box) => box.boxNo === boxNo);
            const checked = selectedBoxes.includes(boxNo);
            const refs = getDocumentRefsForBox(session, boxNo);
            return (
              <Pressable
                key={boxNo}
                style={styles.boxRow}
                onPress={() => toggleBox(boxNo)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
              >
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={checked ? colors.accent : colors.muted}
                />
                <View style={styles.boxInfo}>
                  <Text style={styles.boxLabel}>
                    {th.scan.boxTitle} #{boxNo}
                    {boxMeta?.closedAt ? ` · ${th.print.boxClosed}` : ` · ${th.print.boxHasItems}`}
                    {refs.length ? ` · ${formatDocumentRefRange(refs)}` : ''}
                  </Text>
                  {boxMeta?.totalQty != null ? (
                    <Text style={styles.boxMeta}>
                      {boxMeta.totalQty} {th.print.pieces}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.muted}>{th.print.noPrintableBoxes}</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.fieldLabel}>{th.print.labelTemplate}</Text>
        <Text style={styles.readonly}>{LABEL_TEMPLATE_LABEL}</Text>

        <AppDropdown
          label={th.print.packingTemplate}
          placeholder={th.print.packingTemplate}
          value={settings.packingTemplateId}
          options={PACKING_TEMPLATE_OPTIONS.map((option) => ({
            label: option.label,
            value: option.id,
          }))}
          onValueChange={(value) =>
            void persistSettings({ packingTemplateId: value as PackingTemplateId })
          }
        />

        <Text style={styles.fieldLabel}>{th.print.printer}</Text>
        <TextInput
          style={styles.input}
          value={settings.labelPrinterName || settings.a4PrinterName}
          onChangeText={(value) =>
            void persistSettings({ labelPrinterName: value, a4PrinterName: value })
          }
          placeholder={th.print.printerPlaceholder}
        />

        <Text style={styles.fieldLabel}>{th.print.copies}</Text>
        <TextInput
          style={styles.input}
          value={copies}
          onChangeText={setCopies}
          keyboardType="number-pad"
        />
      </Card>

      <View style={styles.actionGrid}>
        <AppButton
          title={th.print.previewLabel}
          variant="secondary"
          onPress={() => {
            setPreviewKind('label');
            setRightPanelTab('preview');
            setNotice(th.print.previewLabelNotice);
          }}
        />
        <AppButton
          title={th.print.previewPacking}
          variant="secondary"
          onPress={() => {
            setPreviewKind('packing');
            setRightPanelTab('preview');
            setPreviewPage(0);
            setNotice(th.print.previewPackingNotice);
          }}
        />
        <AppButton title={th.print.printLabel} onPress={() => void printLabels()} />
        <AppButton title={th.print.printPacking} onPress={() => void printPackingList()} />
        <AppButton
          title={th.print.downloadPdf}
          variant="secondary"
          onPress={() => void downloadPdf(previewKind)}
        />
        <AppButton
          title={th.print.reprintLatest}
          disabled={!history[0]}
          onPress={() => history[0] && void reprint(history[0])}
        />
      </View>

      {notice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, rightPanelTab === 'preview' && styles.tabActive]}
          onPress={() => setRightPanelTab('preview')}
        >
          <Text style={[styles.tabText, rightPanelTab === 'preview' && styles.tabTextActive]}>
            {th.print.tabPreview}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, rightPanelTab === 'history' && styles.tabActive]}
          onPress={() => setRightPanelTab('history')}
        >
          <Text style={[styles.tabText, rightPanelTab === 'history' && styles.tabTextActive]}>
            {th.print.tabHistory} ({history.length})
          </Text>
        </Pressable>
      </View>

      {rightPanelTab === 'preview' ? (
        <Card style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.sectionTitle}>
              {previewKind === 'label'
                ? th.print.previewTitleLabel
                : th.print.previewTitlePacking}
            </Text>
            {previewKind === 'label' && labelPages.length > 1 ? (
              <View style={styles.pageNav}>
                <Pressable
                  disabled={previewPage <= 0}
                  onPress={() => setPreviewPage((i) => Math.max(0, i - 1))}
                  style={styles.pageBtn}
                >
                  <Text style={styles.pageBtnText}>‹</Text>
                </Pressable>
                <Text style={styles.pageLabel}>
                  {th.print.page} {previewPage + 1} / {labelPages.length}
                </Text>
                <Pressable
                  disabled={previewPage >= labelPages.length - 1}
                  onPress={() =>
                    setPreviewPage((i) => Math.min(labelPages.length - 1, i + 1))
                  }
                  style={styles.pageBtn}
                >
                  <Text style={styles.pageBtnText}>›</Text>
                </Pressable>
              </View>
            ) : null}
            {previewKind === 'packing' && packingDataList.length > 1 ? (
              <View style={styles.pageNav}>
                <Pressable
                  disabled={previewPage <= 0}
                  onPress={() => setPreviewPage((i) => Math.max(0, i - 1))}
                  style={styles.pageBtn}
                >
                  <Text style={styles.pageBtnText}>‹</Text>
                </Pressable>
                <Text style={styles.pageLabel}>
                  {th.print.page} {previewPage + 1} / {packingDataList.length}
                </Text>
                <Pressable
                  disabled={previewPage >= packingDataList.length - 1}
                  onPress={() =>
                    setPreviewPage((i) => Math.min(packingDataList.length - 1, i + 1))
                  }
                  style={styles.pageBtn}
                >
                  <Text style={styles.pageBtnText}>›</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {previewHtml ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: previewHtml }}
              style={[
                styles.webview,
                previewKind === 'label' ? styles.webviewLabel : styles.webviewPacking,
              ]}
              scrollEnabled
              nestedScrollEnabled
              scalesPageToFit={Platform.OS === 'android'}
              javaScriptEnabled
            />
          ) : (
            <Text style={styles.muted}>{th.print.previewSelectBoxes}</Text>
          )}
        </Card>
      ) : (
        <Card>
          {history.length ? (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.historyRow}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{item.title}</Text>
                    <Text style={styles.historyMeta}>
                      {formatWhen(item.at)} ·{' '}
                      {item.type === 'label' ? th.print.historyLabel : th.print.historyPacking}
                      {item.boxNos.length
                        ? ` · ${th.scan.boxTitle} ${item.boxNos.join(',')}`
                        : ''}
                    </Text>
                  </View>
                  <AppButton
                    title={th.jobActions.reprint}
                    variant="secondary"
                    onPress={() => void reprint(item)}
                  />
                </View>
              )}
            />
          ) : (
            <Text style={styles.muted}>{th.print.historyEmpty}</Text>
          )}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  lede: { color: colors.muted, lineHeight: 20 },
  loadingText: { color: colors.muted, textAlign: 'center', padding: 16 },
  sectionTitle: { fontWeight: '700', color: colors.ink, flex: 1 },
  boxHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  boxActions: { flexDirection: 'row', gap: 8 },
  linkBtn: { minHeight: minTouch, justifyContent: 'center', paddingHorizontal: 4 },
  linkText: { color: colors.accent, fontWeight: '600' },
  boxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    minHeight: minTouch,
  },
  boxInfo: { flex: 1 },
  boxLabel: { color: colors.ink, lineHeight: 20 },
  boxMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  fieldLabel: { fontWeight: '600', color: colors.ink, marginBottom: 4 },
  readonly: { color: colors.muted, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notice: {
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  noticeText: { color: colors.ink },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: {
    flex: 1,
    minHeight: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.accent },
  tabText: { color: colors.muted, fontWeight: '600' },
  tabTextActive: { color: colors.accent },
  previewCard: { paddingBottom: 0, overflow: 'hidden' },
  previewHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pageNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
  },
  pageBtnText: { fontSize: 18, color: colors.ink },
  pageLabel: { color: colors.muted, fontSize: 13 },
  webview: { backgroundColor: '#fff' },
  webviewLabel: { height: 560 },
  webviewPacking: { height: 480 },
  muted: { color: colors.muted, lineHeight: 20 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  historyInfo: { flex: 1 },
  historyTitle: { fontWeight: '700', color: colors.ink },
  historyMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
