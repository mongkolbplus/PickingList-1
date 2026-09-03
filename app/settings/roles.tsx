import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { colors } from '../../src/theme/colors';

const permissions = [
  { menu: 'งานบรรจุสินค้า', view: true, edit: true, delete: false, close: true, print: true },
  { menu: 'เอกสาร', view: true, edit: true, delete: false, close: false, print: true },
  { menu: 'พิมพ์เอกสาร', view: true, edit: false, delete: false, close: false, print: true },
  { menu: 'รายงาน', view: true, edit: false, delete: false, close: false, print: false },
  { menu: 'ตั้งค่า', view: false, edit: false, delete: false, close: false, print: false },
];

export default function RolesScreen() {
  return (
    <Screen title="สิทธิ์การใช้งาน" subtitle="กำหนดสิทธิ์การเข้าถึงเมนูและฟังก์ชัน (ตัวอย่าง UAT v1)">
      <Card>
        <Text style={styles.label}>บทบาท</Text>
        <Text style={styles.value}>ผู้จัดสินค้า (Store Staff)</Text>
        <Text style={styles.desc}>ผู้ใช้งานสำหรับจัดสินค้า สแกนสินค้า และพิมพ์เอกสาร</Text>
      </Card>

      <Card>
        <Text style={styles.label}>สิทธิ์ตามข้อมูล</Text>
        <Text style={styles.value}>เฉพาะคลังที่กำหนด</Text>
      </Card>

      {permissions.map((p) => (
        <Card key={p.menu}>
          <Text style={styles.menu}>{p.menu}</Text>
          <View style={styles.row}>
            <Badge label="ดู" on={p.view} />
            <Badge label="แก้ไข" on={p.edit} />
            <Badge label="ลบ" on={p.delete} />
            <Badge label="ปิดงาน" on={p.close} />
            <Badge label="พิมพ์" on={p.print} />
          </View>
        </Card>
      ))}

      <Text style={styles.note}>หมายเหตุ: สิทธิ์ 'ดูข้อมูล' จะต้องถูกเลือกก่อน จึงจะกำหนดสิทธิ์อื่นๆ ได้</Text>
    </Screen>
  );
}

function Badge({ label, on }: { label: string; on: boolean }) {
  return (
    <View style={[styles.badge, on ? styles.badgeOn : styles.badgeOff]}>
      <Text style={[styles.badgeText, on ? styles.badgeTextOn : undefined]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 12 },
  value: { fontSize: 16, fontWeight: '700', color: colors.ink },
  desc: { color: colors.muted, marginTop: 4 },
  menu: { fontWeight: '700', marginBottom: 8, color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  badgeOn: { backgroundColor: colors.infoBg, borderColor: colors.accent },
  badgeOff: { backgroundColor: colors.bgAccent, borderColor: colors.line },
  badgeText: { fontSize: 11, color: colors.muted },
  badgeTextOn: { color: colors.accent, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 12 },
});
