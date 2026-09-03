import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { th } from '@scan-goods/shared';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { Card } from '../../src/components/Card';
import { useAuthStore } from '../../src/store/authStore';
import { useOfflineQueue } from '../../src/hooks/useOfflineQueue';
import { colors } from '../../src/theme/colors';

export default function SettingsScreen() {
  const erpApiUrl = useAuthStore((s) => s.erpApiUrl);
  const setErpUrl = useAuthStore((s) => s.setErpUrl);
  const logout = useAuthStore((s) => s.logout);
  const org = useAuthStore((s) => s.org);
  const { pendingCount, retry } = useOfflineQueue();

  return (
    <Screen title={th.nav.settings}>
      <Card>
        <Text style={styles.label}>บริษัท / สาขา / คลัง</Text>
        <Text style={styles.value}>{org?.company} · {org?.branch} · {org?.warehouse}</Text>
      </Card>

      <Card>
        <Text style={styles.label}>ERP API URL</Text>
        <Text style={styles.value}>{erpApiUrl}</Text>
        <AppButton
          title="ทดสอบ/บันทึก URL"
          variant="secondary"
          onPress={() =>
            Alert.prompt?.('ERP URL', 'กรอก URL', async (url) => {
              if (url) await setErpUrl(url);
            }) ?? Alert.alert('ERP URL', erpApiUrl)
          }
        />
      </Card>

      <Card>
        <Text style={styles.label}>คิวออฟไลน์</Text>
        <Text style={styles.value}>รอส่ง {pendingCount} รายการ</Text>
        <AppButton title="ลองส่งอีกครั้ง" onPress={() => void retry()} />
      </Card>

      <Card>
        <Text style={styles.label}>เครื่องพิมพ์ / เสียง</Text>
        <Text style={styles.value}>Printer Label 1 · A4 · เสียงแจ้งเตือนเปิด</Text>
      </Card>

      <AppButton title="สิทธิ์การใช้งาน" variant="secondary" onPress={() => router.push('/settings/roles')} fullWidth />
      <AppButton
        title={th.nav.logout}
        variant="danger"
        onPress={() => logout().then(() => router.replace('/(auth)/login'))}
        fullWidth
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  value: { fontSize: 15, color: colors.ink, marginBottom: 8 },
});
