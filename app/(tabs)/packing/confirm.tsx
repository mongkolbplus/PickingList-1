import { useState } from 'react';

import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Redirect, router } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import {

  buildCloseJobSummary,

  hasClosedBoxScans,

  th,

} from '@scan-goods/shared';

import { Screen } from '../../../src/components/Screen';

import { AppButton } from '../../../src/components/AppButton';

import { Card } from '../../../src/components/Card';

import { usePackingStore } from '../../../src/store/packingStore';

import { releaseDocumentLocks } from '../../../src/services/documentLock';

import { colors, minTouch } from '../../../src/theme/colors';



function logConfirmClose(step: string, detail?: Record<string, unknown>) {

  const suffix = detail ? ` ${JSON.stringify(detail)}` : '';

  console.log(`[ConfirmClose] ${step}${suffix}`);

}



export default function ConfirmCloseScreen() {

  const session = usePackingStore((s) => s.session);

  const closeSession = usePackingStore((s) => s.closeSession);

  const pauseSession = usePackingStore((s) => s.pauseSession);

  const [checkerName, setCheckerName] = useState('');

  const [notes, setNotes] = useState('');

  const [allowPartial, setAllowPartial] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);



  if (!session) return <Redirect href="/(tabs)/documents" />;

  if (session.status === 'confirmed') return <Redirect href="/(tabs)/packing/print" />;



  const summary = buildCloseJobSummary(session);

  const hasIssues = summary.anomalies.length > 0;



  const finishClose = async () => {

    await closeSession(session, {

      checkerName: checkerName || undefined,

      notes: notes || undefined,

      allowPartial,

    });

    await releaseDocumentLocks(

      session.documents.map((doc) => doc.diKey),

      session.sessionId,

    );

    router.replace('/(tabs)/packing/print');

  };



  const onConfirm = async () => {

    if (!session) return;

    if (hasIssues && !allowPartial) {

      logConfirmClose('submit:blocked', { reason: 'partial-not-allowed', anomalies: summary.anomalies });

      Alert.alert('', th.confirm.partialAlert);

      return;

    }

    if (!hasClosedBoxScans(session)) {

      logConfirmClose('submit:blocked', { reason: 'no-closed-box-scans' });

      setError(th.confirm.noClosedBoxScans);

      return;

    }



    setLoading(true);

    setError(null);

    try {

      logConfirmClose('submit:start', {

        sessionId: session.sessionId,

        allowPartial,

        hasIssues,

        checkerName: checkerName || null,

        notesLength: notes.length,

        summary,

        documentRefs: session.documents.map((doc) => doc.diRef),

      });

      await finishClose();

      logConfirmClose('submit:complete', { mode: 'local-close' });

    } catch (err) {

      logConfirmClose('submit:failed', {

        message: err instanceof Error ? err.message : String(err),

        name: err instanceof Error ? err.name : 'unknown',

      });

      Alert.alert(

        'ปิดงานไม่สำเร็จ',

        err instanceof Error ? err.message : String(err),

      );

    } finally {

      setLoading(false);

    }

  };



  const onPause = async () => {

    await pauseSession();

    router.replace('/(tabs)');

  };



  return (

    <Screen title={th.confirm.title} subtitle={th.confirm.eyebrow}>

      <View style={styles.metrics}>

        <Card style={styles.metric}>

          <Text style={styles.metricLabel}>{th.confirm.docQty}</Text>

          <Text style={styles.metricValue}>{summary.documentQty}</Text>

        </Card>

        <Card style={styles.metric}>

          <Text style={styles.metricLabel}>{th.confirm.scannedQty}</Text>

          <Text style={styles.metricValue}>{summary.scannedQty}</Text>

        </Card>

        <Card style={styles.metric}>

          <Text style={styles.metricLabel}>{th.confirm.shortQty}</Text>

          <Text style={[styles.metricValue, { color: colors.warn }]}>{summary.shortQty}</Text>

        </Card>

        <Card style={styles.metric}>

          <Text style={styles.metricLabel}>{th.confirm.overQty}</Text>

          <Text style={[styles.metricValue, { color: colors.danger }]}>{summary.overQty}</Text>

        </Card>

        <Card style={styles.metric}>

          <Text style={styles.metricLabel}>{th.confirm.boxCount}</Text>

          <Text style={styles.metricValue}>{summary.boxCount}</Text>

        </Card>

      </View>



      {summary.anomalies.length > 0 ? (

        <Card>

          <Text style={styles.section}>{th.confirm.anomalies}</Text>

          {summary.anomalies.map((a) => (

            <Text key={a} style={styles.anomaly}>

              • {a}

            </Text>

          ))}

          <Pressable

            style={styles.checkboxRow}

            onPress={() => setAllowPartial((v) => !v)}

            accessibilityRole="checkbox"

            accessibilityState={{ checked: allowPartial }}

          >

            <Ionicons

              name={allowPartial ? 'checkbox' : 'square-outline'}

              size={22}

              color={allowPartial ? colors.accent : colors.muted}

            />

            <Text style={styles.checkboxLabel}>{th.confirm.partialCheckbox}</Text>

          </Pressable>

        </Card>

      ) : (

        <Card>

          <Text style={styles.ok}>ไม่พบรายการผิดปกติ</Text>

        </Card>

      )}



      <Card>

        <Text style={styles.label}>{th.confirm.checker}</Text>

        <TextInput

          style={styles.input}

          value={checkerName}

          onChangeText={setCheckerName}

          placeholder={th.confirm.checker}

        />

        <Text style={[styles.label, styles.notesLabel]}>{th.confirm.notes}</Text>

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



      {error ? (

        <View style={styles.errorBanner}>

          <Text style={styles.errorText}>{error}</Text>

        </View>

      ) : null}



      <View style={styles.actions}>

        <AppButton title={th.confirm.pause} variant="ghost" onPress={() => void onPause()} disabled={loading} />

        <AppButton

          title={th.confirm.backToScan}

          variant="secondary"

          onPress={() => router.replace('/(tabs)/packing/scan')}

          disabled={loading}

        />

        <AppButton

          title={loading ? th.confirm.submitting : th.confirm.submit}

          onPress={() => void onConfirm()}

          disabled={loading}

        />

      </View>

    </Screen>

  );

}



const styles = StyleSheet.create({

  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  metric: { flex: 1, minWidth: '30%', alignItems: 'center' },

  metricLabel: { color: colors.muted, fontSize: 12 },

  metricValue: { fontSize: 24, fontWeight: '700', color: colors.ink },

  section: { fontWeight: '700', marginBottom: 8 },

  ok: { color: colors.ok },

  anomaly: { color: colors.danger, marginBottom: 4 },

  checkboxRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 10,

    marginTop: 12,

    minHeight: minTouch,

  },

  checkboxLabel: { flex: 1, color: colors.ink },

  label: { fontWeight: '600', marginBottom: 8 },

  notesLabel: { marginTop: 12 },

  input: {

    borderWidth: 1,

    borderColor: colors.line,

    borderRadius: 10,

    padding: 12,

  },

  notes: {

    minHeight: 100,

    borderWidth: 1,

    borderColor: colors.line,

    borderRadius: 10,

    padding: 12,

    textAlignVertical: 'top',

  },

  counter: { textAlign: 'right', color: colors.muted, fontSize: 12, marginTop: 4 },

  errorBanner: {

    backgroundColor: '#fdecea',

    borderRadius: 10,

    padding: 12,

    borderWidth: 1,

    borderColor: colors.danger,

  },

  errorText: { color: colors.danger },

  actions: { gap: 8 },

});

