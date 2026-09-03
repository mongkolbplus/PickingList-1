import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  ErpError,
  erpTestConnection,
  getDefaultErpApiBaseUrl,
  resolveErpConnectionUrl,
  setErpApiBaseUrl,
  setErpHttpMode,
  th,
} from '@scan-goods/shared';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { Card } from '../../src/components/Card';
import { useAuthStore } from '../../src/store/authStore';
import { colors } from '../../src/theme/colors';

export default function ApiSettingsScreen() {
  const erpApiUrl = useAuthStore((s) => s.erpApiUrl);
  const erpHttpMode = useAuthStore((s) => s.erpHttpMode);
  const setErpUrl = useAuthStore((s) => s.setErpUrl);
  const setHttpMode = useAuthStore((s) => s.setHttpMode);
  const [baseUrl, setBaseUrl] = useState(erpApiUrl);
  const [httpMode, setHttpModeLocal] = useState(erpHttpMode);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBaseUrl(erpApiUrl);
  }, [erpApiUrl]);

  useEffect(() => {
    setHttpModeLocal(erpHttpMode);
  }, [erpHttpMode]);

  const effectiveUrl = resolveErpConnectionUrl(baseUrl.trim() || erpApiUrl, httpMode);

  const applyConnectionSettings = () => {
    setErpHttpMode(httpMode);
    setErpApiBaseUrl(baseUrl.trim());
  };

  const onTest = async () => {
    const trimmed = baseUrl.trim();
    if (!trimmed) {
      setTestStatus('กรุณากรอกที่อยู่ API');
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setTestStatus('ที่อยู่ API ต้องขึ้นต้นด้วย http:// หรือ https://');
      return;
    }

    setTestBusy(true);
    setTestStatus(null);
    applyConnectionSettings();
    try {
      await erpTestConnection();
      setTestStatus(th.erpSettings.testOk);
    } catch (error) {
      setTestStatus(
        error instanceof ErpError ? error.message : th.erpSettings.testFailed,
      );
    } finally {
      setTestBusy(false);
    }
  };

  const onReset = () => {
    const next = getDefaultErpApiBaseUrl();
    setBaseUrl(next);
    setHttpModeLocal(true);
    setTestStatus(null);
  };

  const onSave = async () => {
    const trimmed = baseUrl.trim();
    if (!trimmed) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกที่อยู่ API');
      return;
    }
    setSaving(true);
    try {
      await setHttpMode(httpMode);
      await setErpUrl(trimmed);
      Alert.alert(th.erpSettings.saved, resolveErpConnectionUrl(trimmed), [
        { text: 'ตกลง', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('บันทึกไม่สำเร็จ', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title={th.erpSettings.title} subtitle={th.erpSettings.hint}>
      <Card>
        <Text style={styles.label}>{th.erpSettings.fieldLabel}</Text>
        <TextInput
          style={styles.input}
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder="http://192.168.0.110:8422/ws1/BplusErpDvSvrIIS31.dll"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>{th.erpSettings.httpMode}</Text>
            <Text style={styles.switchHint}>{th.erpSettings.httpModeHint}</Text>
          </View>
          <Switch
            value={httpMode}
            onValueChange={setHttpModeLocal}
            trackColor={{ false: colors.line, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>

        {httpMode && effectiveUrl !== baseUrl.trim() ? (
          <Text style={styles.effectiveUrl}>
            {th.erpSettings.effectiveUrl}: {effectiveUrl}
          </Text>
        ) : null}

        {testStatus ? (
          <Text
            style={[
              styles.testStatus,
              testStatus === th.erpSettings.testOk ? styles.testOk : styles.testFail,
            ]}
          >
            {testStatus}
          </Text>
        ) : null}
        <AppButton
          title={testBusy ? th.erpSettings.testing : th.erpSettings.test}
          variant="secondary"
          onPress={() => void onTest()}
          fullWidth
        />
        <AppButton title={th.erpSettings.reset} variant="ghost" onPress={onReset} fullWidth />
      </Card>

      <AppButton
        title={saving ? 'กำลังบันทึก...' : th.erpSettings.save}
        onPress={() => void onSave()}
        fullWidth
      />
      <AppButton title={th.erpSettings.close} variant="secondary" onPress={() => router.back()} fullWidth />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  switchText: { flex: 1 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: colors.ink },
  switchHint: { fontSize: 12, color: colors.muted, marginTop: 4 },
  effectiveUrl: {
    fontSize: 12,
    color: colors.accent,
    marginBottom: 12,
  },
  testStatus: { fontSize: 13, marginBottom: 12 },
  testOk: { color: colors.ok },
  testFail: { color: colors.danger },
});
