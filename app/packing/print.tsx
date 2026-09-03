import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { Card } from '../../src/components/Card';
import { usePackingStore } from '../../src/store/packingStore';
import { colors } from '../../src/theme/colors';

function buildLabelHtml(session: NonNullable<ReturnType<typeof usePackingStore.getState>['session']>, boxNo: number) {
  const doc = session.documents[0];
  return `
    <html><body style="font-family:sans-serif;padding:16px">
      <h2>บริษัท ตัวอย่าง จำกัด</h2>
      <h1>${doc?.diRef ?? '-'}</h1>
      <p>วันที่ ${doc?.diDate ?? '-'}</p>
      <h2>กล่องที่ ${boxNo} / ${Math.max(boxNo, session.boxes.length || 1)}</h2>
      <p>ลูกค้า: ${doc?.partyName ?? '-'}</p>
    </body></html>
  `;
}

export default function PrintScreen() {
  const session = usePackingStore((s) => s.session);
  const [tab, setTab] = useState<'label' | 'packing'>('label');
  const boxNo = session?.currentBoxNo ?? 1;

  const previewHtml = useMemo(
    () => (session ? buildLabelHtml(session, boxNo) : '<p>ไม่มีข้อมูล</p>'),
    [session, boxNo],
  );

  const sharePdf = async () => {
    try {
      const file = await Print.printToFileAsync({ html: previewHtml });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
      } else {
        Alert.alert('สำเร็จ', `บันทึกไฟล์ที่ ${file.uri}`);
      }
    } catch (error) {
      Alert.alert('พิมพ์ไม่สำเร็จ', error instanceof Error ? error.message : String(error));
    }
  };

  if (!session) {
    return (
      <Screen title="พิมพ์เอกสาร">
        <AppButton title="กลับหน้าหลัก" onPress={() => router.replace('/(tabs)')} fullWidth />
      </Screen>
    );
  }

  return (
    <Screen title="พิมพ์เอกสาร" subtitle="ตัวอย่างใบปะหน้า / Packing List">
      <View style={styles.tabs}>
        <AppButton title="ใบปะหน้า" variant={tab === 'label' ? 'primary' : 'secondary'} onPress={() => setTab('label')} />
        <AppButton title="Packing List" variant={tab === 'packing' ? 'primary' : 'secondary'} onPress={() => setTab('packing')} />
      </View>

      <Card>
        <Text style={styles.previewTitle}>
          {tab === 'label' ? `ตัวอย่างใบปะหน้า (กล่องที่ ${boxNo})` : 'ตัวอย่าง Packing List'}
        </Text>
        <Text style={styles.previewBody}>
          {session.documents.map((d) => d.diRef).join(', ')}
          {'\n'}
          ลูกค้า: {session.documents[0]?.partyName ?? '-'}
          {'\n'}
          จำนวนกล่อง: {session.boxes.length}
        </Text>
      </Card>

      <Card>
        <Text style={styles.setting}>เครื่องพิมพ์: ZDesigner ZT410</Text>
        <Text style={styles.setting}>ขนาดกระดาษ: Thermal Label</Text>
        <Text style={styles.setting}>สำเนา: 1</Text>
      </Card>

      <View style={styles.actions}>
        <AppButton title="ดาวน์โหลด PDF" variant="secondary" onPress={() => void sharePdf()} fullWidth />
        <AppButton title="พิมพ์ / แชร์" onPress={() => void sharePdf()} fullWidth />
        <AppButton title="กลับหน้าหลัก" variant="ghost" onPress={() => router.replace('/(tabs)')} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8 },
  previewTitle: { fontWeight: '700', marginBottom: 8, color: colors.ink },
  previewBody: { color: colors.muted, lineHeight: 22 },
  setting: { color: colors.ink, marginBottom: 4 },
  actions: { gap: 8 },
});
