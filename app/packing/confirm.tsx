import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { buildCloseJobSummary, th } from '@scan-goods/shared';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { Card } from '../../src/components/Card';
import { useAuthStore } from '../../src/store/authStore';
import { usePackingStore, buildClosePayloadFromSession } from '../../src/store/packingStore';
import { submitPackingClose } from '../../src/services/offlineQueue';
import { useNetwork } from '../../src/hooks/useNetwork';
import { saveJobRecord } from '../../src/services/database';
import { createId } from '../../src/utils/uuid';
import { colors } from '../../src/theme/colors';

export default function ConfirmCloseScreen() {
  const session = usePackingStore((s) => s.session);
  const setSession = usePackingStore((s) => s.setSession);
  const loginGuid = useAuthStore((s) => s.loginGuid);
  const username = useAuthStore((s) => s.username);
  const { isOnline } = useNetwork();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!session) {
    return (
      <Screen title="ตรวจสอบก่อนปิดงาน">
        <Text>ไม่มี session</Text>
      </Screen>
    );
  }

  const summary = buildCloseJobSummary(session);

  const onConfirm = async () => {
    if (!loginGuid) return;
    setLoading(true);
    try {
      const payload = buildClosePayloadFromSession(session, username ?? '', notes, summary.shortQty > 0);
      const result = await submitPackingClose(loginGuid, payload, session.sessionId, isOnline);
      const closedSession = {
        ...session,
        status: 'confirmed' as const,
        workflowStatus: 'เสร็จสิ้น' as const,
        checkerName: username ?? undefined,
        notes,
      };
      await setSession(closedSession);
      await saveJobRecord({
        id: createId(),
        sessionId: session.sessionId,
        documentRefs: session.documents.map((d) => d.diRef),
        customerName: session.documents[0]?.partyName,
        workflowStatus: 'เสร็จสิ้น',
        boxCount: summary.boxCount,
        scannedQty: summary.scannedQty,
        packerName: username ?? undefined,
        checkerName: username ?? undefined,
        startedAt: session.startedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        auditLog: [],
      });
      Alert.alert(
        result.queued ? 'บันทึกคิวแล้ว' : 'ปิดงานสำเร็จ',
        result.queued
          ? 'ออฟไลน์ — ระบบจะส่งข้อมูลเมื่อเชื่อมต่ออินเทอร์เน็ต'
          : 'ยืนยันปิดงานเรียบร้อย',
        [{ text: 'ตกลง', onPress: () => router.replace('/packing/print') }],
      );
    } catch (error) {
      Alert.alert('ปิดงานไม่สำเร็จ', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="ตรวจสอบก่อนปิดงาน" subtitle="สรุปสถานะโดยรวมและรายการที่พบปัญหา">
      <View style={styles.metrics}>
        <Card style={styles.metric}><Text style={styles.metricLabel}>ตามเอกสาร</Text><Text style={styles.metricValue}>{summary.documentQty}</Text></Card>
        <Card style={styles.metric}><Text style={styles.metricLabel}>จัดแล้ว</Text><Text style={styles.metricValue}>{summary.scannedQty}</Text></Card>
        <Card style={styles.metric}><Text style={styles.metricLabel}>ขาด</Text><Text style={[styles.metricValue, { color: colors.warn }]}>{summary.shortQty}</Text></Card>
        <Card style={styles.metric}><Text style={styles.metricLabel}>เกิน</Text><Text style={[styles.metricValue, { color: colors.danger }]}>{summary.overQty}</Text></Card>
      </View>

      <Card>
        <Text style={styles.section}>จำนวนกล่อง: {summary.boxCount}</Text>
        {summary.anomalies.length === 0 ? (
          <Text style={styles.ok}>ไม่พบรายการผิดปกติ</Text>
        ) : (
          summary.anomalies.map((a) => <Text key={a} style={styles.anomaly}>• {a}</Text>)
        )}
      </Card>

      <Card>
        <Text style={styles.label}>หมายเหตุ (ถ้ามี)</Text>
        <TextInput
          style={styles.notes}
          value={notes}
          onChangeText={setNotes}
          placeholder="กรุณาระบุหมายเหตุหรือข้อมูลเพิ่มเติม..."
          multiline
          maxLength={500}
        />
        <Text style={styles.counter}>{notes.length} / 500</Text>
      </Card>

      <View style={styles.actions}>
        <AppButton title="กลับไปแก้ไข" variant="secondary" onPress={() => router.back()} />
        <AppButton title="บันทึกร่างงาน" variant="ghost" onPress={() => router.back()} />
        <AppButton title={loading ? 'กำลังยืนยัน...' : 'ยืนยันปิดงาน'} onPress={() => void onConfirm()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { flex: 1, minWidth: '45%', alignItems: 'center' },
  metricLabel: { color: colors.muted, fontSize: 12 },
  metricValue: { fontSize: 24, fontWeight: '700', color: colors.ink },
  section: { fontWeight: '700', marginBottom: 8 },
  ok: { color: colors.ok },
  anomaly: { color: colors.danger, marginBottom: 4 },
  label: { fontWeight: '600', marginBottom: 8 },
  notes: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
  },
  counter: { textAlign: 'right', color: colors.muted, fontSize: 12 },
  actions: { gap: 8 },
});
