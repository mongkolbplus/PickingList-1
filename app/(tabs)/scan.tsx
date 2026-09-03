import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { calcSessionProgress } from '@scan-goods/shared';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { Card } from '../../src/components/Card';
import { ScanBar } from '../../src/components/ScanBar';
import { StatusBadge } from '../../src/components/StatusBadge';
import { usePackingStore } from '../../src/store/packingStore';
import { loadLatestSessionSnapshot } from '../../src/services/database';
import { BARCODE_SCAN_TYPES } from '../../src/constants/barcodeScan';
import { colors } from '../../src/theme/colors';

export default function ScanScreen() {
  const session = usePackingStore((s) => s.session);
  const restoreSession = usePackingStore((s) => s.restoreSession);
  const scanBarcode = usePackingStore((s) => s.scanBarcode);
  const undoLastScan = usePackingStore((s) => s.undoLastScan);
  const closeCurrentBox = usePackingStore((s) => s.closeCurrentBox);
  const createNewBox = usePackingStore((s) => s.createNewBox);
  const pauseSession = usePackingStore((s) => s.pauseSession);
  const lastScanMessage = usePackingStore((s) => s.lastScanMessage);

  const [barcode, setBarcode] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanningRef = useRef(false);

  useEffect(() => {
    if (!session) {
      void loadLatestSessionSnapshot().then((snap) => {
        if (snap) void restoreSession(snap);
      });
    }
  }, [session, restoreSession]);

  const progress = session ? calcSessionProgress(session) : null;

  const submitScan = async (raw?: string) => {
    const code = (raw ?? barcode).trim();
    if (!code || scanningRef.current) return;

    scanningRef.current = true;
    try {
      const msg = await scanBarcode(code);
      setBarcode('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('สแกนสำเร็จ', msg);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('สแกนไม่สำเร็จ', error instanceof Error ? error.message : String(error));
    } finally {
      scanningRef.current = false;
    }
  };

  if (!session) {
    return (
      <Screen title="สแกนสินค้า">
        <Card>
          <Text style={styles.empty}>ยังไม่มีเอกสารที่เปิดอยู่</Text>
          <AppButton title="ไปเลือกเอกสาร" onPress={() => router.push('/(tabs)/documents')} fullWidth />
        </Card>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen title="สแกนสินค้า" subtitle={session.documents.map((d) => d.diRef).join(', ')} scroll={false}>
        <Card>
          <Text style={styles.meta}>กล่องปัจจุบัน #{session.currentBoxNo}</Text>
          {progress ? (
            <Text style={styles.meta}>
              ความคืบหน้า {progress.scannedQty}/{progress.documentQty} ({progress.percent}%)
            </Text>
          ) : null}
          {lastScanMessage ? <Text style={styles.feedback}>{lastScanMessage}</Text> : null}
        </Card>

        <FlatList
          data={session.items.filter((i) => i.remainingQty > 0).slice(0, 50)}
          keyExtractor={(item) => item.itemId}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 8, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Card>
              <Text style={styles.itemCode}>{item.skuCode} · {item.goodsCode}</Text>
              <Text style={styles.itemName}>{item.skuName}</Text>
              <View style={styles.itemRow}>
                <Text>สั่ง {item.documentQty + item.freeQty}</Text>
                <Text>จัด {item.scanQty}</Text>
                <Text>คงเหลือ {item.remainingQty}</Text>
                <StatusBadge
                  label={item.remainingQty === 0 ? 'จัดแล้ว' : 'กำลังจัด'}
                  tone={item.remainingQty === 0 ? 'ok' : 'warn'}
                />
              </View>
            </Card>
          )}
        />
      </Screen>

      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: BARCODE_SCAN_TYPES }}
            onBarcodeScanned={({ data }) => {
              if (scanningRef.current) return;
              setShowCamera(false);
              setBarcode(data);
              void submitScan(data);
            }}
          />
          <View style={styles.cameraFooter}>
            <AppButton title="ปิดกล้อง" variant="secondary" onPress={() => setShowCamera(false)} fullWidth />
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <View style={styles.actions}>
          <AppButton title="+ กล่องใหม่" variant="success" onPress={() => void createNewBox()} />
          <AppButton title="ยกเลิกล่าสุด" variant="secondary" onPress={() => void undoLastScan()} />
          <AppButton title="พักงาน" variant="ghost" onPress={() => void pauseSession()} />
          <AppButton title="ปิดงาน" variant="danger" onPress={() => router.push('/packing/confirm')} />
        </View>
        <ScanBar
          value={barcode}
          onChangeText={setBarcode}
          onSubmit={() => void submitScan()}
          onCameraPress={async () => {
            if (!permission?.granted) {
              const result = await requestPermission();
              if (!result.granted) {
                Alert.alert('ต้องการสิทธิ์กล้อง', 'เปิดสิทธิ์กล้องเพื่อสแกนบาร์โค้ด');
                return;
              }
            }
            setShowCamera(true);
          }}
        />
        <AppButton title="ปิดกล่องปัจจุบัน" onPress={() => void closeCurrentBox().catch((e) => Alert.alert('ผิดพลาด', e.message))} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, marginBottom: 12 },
  meta: { color: colors.ink, fontWeight: '600' },
  feedback: { color: colors.ok, marginTop: 4 },
  itemCode: { fontWeight: '700', color: colors.ink },
  itemName: { color: colors.muted, marginBottom: 6 },
  itemRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraFooter: { padding: 16, backgroundColor: colors.bg },
});
