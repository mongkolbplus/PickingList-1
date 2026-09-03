import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { MetricCard } from '../../src/components/MetricCard';
import { Card } from '../../src/components/Card';
import { usePackingStore } from '../../src/store/packingStore';
import { colors } from '../../src/theme/colors';

export default function ReportsScreen() {
  const jobs = usePackingStore((s) => s.jobs);
  const totalDocs = jobs.length;
  const totalScanned = jobs.reduce((s, j) => s + j.scannedQty, 0);
  const totalBoxes = jobs.reduce((s, j) => s + j.boxCount, 0);
  const done = jobs.filter((j) => j.workflowStatus === 'เสร็จสิ้น' || j.workflowStatus === 'ปิดงานแล้ว').length;
  const accuracy = totalDocs ? Math.round((done / totalDocs) * 1000) / 10 : 100;

  const waiting = jobs.filter((j) => j.workflowStatus === 'รอจัดสินค้า').length;
  const inProgress = jobs.filter((j) => j.workflowStatus === 'กำลังจัดสินค้า').length;
  const problem = jobs.filter((j) => j.workflowStatus === 'มีปัญหา').length;

  return (
    <Screen title="รายงานและ Dashboard" subtitle="สรุปภาพรวมและสัดส่วนสถานะงาน">
      <View style={styles.metrics}>
        <MetricCard title="เอกสารทั้งหมด" value={totalDocs} unit="รายการ" icon="document-text-outline" />
        <MetricCard title="สินค้ารวม" value={totalScanned} unit="ชิ้น" icon="cube-outline" tone="green" />
        <MetricCard title="กล่องรวม" value={totalBoxes} unit="กล่อง" icon="archive-outline" tone="navy" />
        <MetricCard title="ความถูกต้อง" value={`${accuracy}%`} icon="shield-checkmark-outline" tone="green" />
      </View>

      <Card>
        <Text style={styles.section}>จำนวนเอกสารแยกตามสถานะ</Text>
        <Text style={styles.row}>รอเตรียมสินค้า: {waiting}</Text>
        <Text style={styles.row}>กำลังจัดสินค้า: {inProgress}</Text>
        <Text style={styles.row}>จัดส่งแล้วเสร็จ: {done}</Text>
        <Text style={styles.row}>ปัญหา: {problem}</Text>
      </Card>

      <Card style={styles.info}>
        <Text style={styles.infoText}>ข้อมูลใน Dashboard อัพเดทจากงานในเครื่อง</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  section: { fontWeight: '700', fontSize: 16, marginBottom: 8, color: colors.ink },
  row: { color: colors.ink, marginBottom: 4 },
  info: { backgroundColor: colors.infoBg, borderColor: colors.info },
  infoText: { color: colors.ink },
});
