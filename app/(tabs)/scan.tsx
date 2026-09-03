import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
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

  useEffect(() => {
    if (!session) {
      void loadLatestSessionSnapshot().then((snap) => {
        if (snap) void restoreSession(snap);
      });
    }
  }, [session, restoreSession]);

  const progress = session ? calcSessionProgress(session) : null;

  const onSubmitScan = async () => {
    if (!barcode.trim()) return;
    try {
      const msg = await scanBarcode(barcode);
      setBarcode('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('สแกนสำเร็จ', msg);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('สแกนไม่สำเร็จ', error instanceof Error ? error.message : String(error));
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

      {showCamera ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'qr'] }}
            onBarcodeScanned={({ data }) => {
              setBarcode(data);
              setShowCamera(false);
              void onSubmitScan();
            }}
          />
          <AppButton title="ปิดกล้อง" variant="secondary" onPress={() => setShowCamera(false)} />
        </View>
      ) : null}

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
          onSubmit={() => void onSubmitScan()}
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
  cameraWrap: { ...StyleSheet.absoluteFill, backgroundColor: '#000', padding: 12, justifyContent: 'flex-end' },
  camera: { flex: 1, borderRadius: 12, marginBottom: 12 },
});
