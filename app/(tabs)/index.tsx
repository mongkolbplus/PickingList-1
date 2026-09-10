import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { th } from '@scan-goods/shared';
import { Screen } from '../../src/components/Screen';
import { MetricCard } from '../../src/components/MetricCard';
import { AppButton } from '../../src/components/AppButton';
import { Card } from '../../src/components/Card';
import { StatusBadge } from '../../src/components/StatusBadge';
import { useAuthStore } from '../../src/store/authStore';
import { usePackingStore } from '../../src/store/packingStore';
import { colors } from '../../src/theme/colors';

export default function DashboardScreen() {
  const org = useAuthStore((s) => s.org);
  const username = useAuthStore((s) => s.username);
  const jobs = usePackingStore((s) => s.jobs);

  const waiting = jobs.filter((j) => j.workflowStatus === 'รอจัดสินค้า').length;
  const inProgress = jobs.filter((j) => j.workflowStatus === 'กำลังจัดสินค้า').length;
  const done = jobs.filter((j) => j.workflowStatus === 'เสร็จสิ้น' || j.workflowStatus === 'ปิดงานแล้ว').length;
  const problem = jobs.filter((j) => j.workflowStatus === 'มีปัญหา').length;

  return (
    <Screen
      title={th.dashboard.title}
      subtitle={org ? `${org.company} · ${org.branch}` : undefined}
      headerRight={<Text style={styles.user}>{username}</Text>}
    >
      <View style={styles.metrics}>
        <MetricCard title={th.dashboard.waiting} value={waiting} icon="time-outline" tone="blue" />
        <MetricCard title={th.dashboard.inProgress} value={inProgress} icon="hourglass-outline" tone="navy" />
        <MetricCard title={th.dashboard.done} value={done} icon="checkmark-circle-outline" tone="green" />
        <MetricCard title={th.dashboard.problem} value={problem} icon="warning-outline" tone="orange" />
      </View>

      <AppButton title={th.dashboard.startPacking} onPress={() => router.push('/(tabs)/documents')} fullWidth />

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{th.dashboard.recentJobs}</Text>
          <AppButton title={th.dashboard.viewAll} variant="ghost" onPress={() => router.push('/(tabs)/history')} />
        </View>
        {jobs.length === 0 ? (
          <Text style={styles.empty}>ยังไม่มีประวัติงาน</Text>
        ) : (
          jobs.slice(0, 5).map((job) => (
            <View key={job.id} style={styles.jobRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobRef}>{job.documentRefs.join(', ')}</Text>
                <Text style={styles.jobMeta}>{job.customerName ?? '-'} · {job.boxCount} กล่อง</Text>
              </View>
              <StatusBadge label={job.workflowStatus} tone={job.workflowStatus === 'มีปัญหา' ? 'danger' : 'info'} />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  user: { color: colors.muted, fontSize: 13 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  empty: { color: colors.muted },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  jobRef: { fontWeight: '600', color: colors.ink },
  jobMeta: { color: colors.muted, fontSize: 12 },
});
