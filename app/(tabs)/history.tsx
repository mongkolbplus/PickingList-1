import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { loadJobHistory } from '../../src/services/database';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { StatusBadge } from '../../src/components/StatusBadge';
import { usePackingStore } from '../../src/store/packingStore';
import { colors } from '../../src/theme/colors';

export default function HistoryScreen() {
  const jobs = usePackingStore((s) => s.jobs);
  const loadJobs = usePackingStore((s) => s.loadJobs);

  useEffect(() => {
    void loadJobHistory().then(loadJobs);
  }, [loadJobs]);

  return (
    <Screen title="ประวัติงาน" subtitle="ค้นหาย้อนหลังตามช่วงวันที่ สถานะ และผู้ดำเนินการ">
      {jobs.length === 0 ? (
        <Card><Text style={styles.empty}>ไม่มีประวัติงาน</Text></Card>
      ) : (
        jobs.map((job) => (
          <Card key={job.id}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ref}>{job.documentRefs.join(', ')}</Text>
                <Text style={styles.meta}>{job.customerName ?? '-'} · {job.boxCount} กล่อง · {job.scannedQty} ชิ้น</Text>
                <Text style={styles.meta}>{job.updatedAt}</Text>
              </View>
              <StatusBadge label={job.workflowStatus} tone="info" />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.muted },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ref: { fontWeight: '700', color: colors.ink },
  meta: { color: colors.muted, fontSize: 12 },
});
