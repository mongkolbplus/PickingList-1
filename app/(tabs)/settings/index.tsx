import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  LABEL_TEMPLATE_LABEL,
  PACKING_TEMPLATE_OPTIONS,
  orgPrintKey,
  th,
  type PackingTemplateId,
  type PrintSettings,
  type ScanInputMode,
} from '@scan-goods/shared';
import { Screen } from '../../../src/components/Screen';
import { AppButton } from '../../../src/components/AppButton';
import { AppDropdown } from '../../../src/components/AppDropdown';
import { Card } from '../../../src/components/Card';
import { useAuthStore } from '../../../src/store/authStore';
import {
  loadPrintSettings,
  savePrintSettings,
} from '../../../src/services/printSettings';
import {
  loadScanInputMode,
  saveScanInputMode,
} from '../../../src/services/scanInputSettings';
import {
  loadSoundEnabled,
  saveSoundEnabled,
} from '../../../src/services/soundSettings';
import { colors, minTouch, radius } from '../../../src/theme/colors';

function SettingsCard({
  icon,
  title,
  desc,
  action,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name={icon} size={20} color={colors.accent} />
        </View>
        <View style={styles.cardTitles}>
          <Text style={styles.cardTitle}>{title}</Text>
          {desc ? <Text style={styles.cardDesc}>{desc}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </Card>
  );
}

export default function SettingsScreen() {
  const erpApiUrl = useAuthStore((s) => s.erpApiUrl);
  const logout = useAuthStore((s) => s.logout);
  const org = useAuthStore((s) => s.org);
  const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanInputMode, setScanInputMode] = useState<ScanInputMode>('scanner');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const [print, sound, scanMode] = await Promise.all([
        loadPrintSettings(),
        loadSoundEnabled(),
        loadScanInputMode(),
      ]);
      setPrintSettings({
        ...print,
        orgKey: orgPrintKey(org?.company, org?.branch),
      });
      setSoundEnabled(sound);
      setScanInputMode(scanMode);
      setReady(true);
    })();
  }, [org?.branch, org?.company]);

  const updatePrint = useCallback(
    <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
      setPrintSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    [],
  );

  const saveAll = useCallback(async () => {
    if (!printSettings) return;
    const next = {
      ...printSettings,
      orgKey: orgPrintKey(org?.company, org?.branch),
    };
    await savePrintSettings(next);
    await saveSoundEnabled(soundEnabled);
    await saveScanInputMode(scanInputMode);
    setPrintSettings(next);
    setSavedNotice(th.settings.saved);
    setTimeout(() => setSavedNotice(null), 2500);
  }, [org?.branch, org?.company, printSettings, scanInputMode, soundEnabled]);

  const onScanModeChange = async (mode: ScanInputMode) => {
    setScanInputMode(mode);
    await saveScanInputMode(mode);
  };

  const onSoundChange = async (enabled: boolean) => {
    setSoundEnabled(enabled);
    await saveSoundEnabled(enabled);
  };

  if (!ready || !printSettings) {
    return (
      <Screen title={th.settings.title} subtitle={th.settings.eyebrow}>
        <Text style={styles.loading}>กำลังโหลด...</Text>
      </Screen>
    );
  }

  return (
    <Screen
      title={th.settings.title}
      subtitle={th.settings.eyebrow}
      headerRight={
        <View style={styles.headerActions}>
          {savedNotice ? <Text style={styles.savedNotice}>{savedNotice}</Text> : null}
          <AppButton title={th.settings.save} onPress={() => void saveAll()} />
        </View>
      }
    >
      <SettingsCard
        icon="link-outline"
        title={th.settings.erpTitle}
        desc={th.settings.erpUrlLabel}
        action={
          <Pressable
            style={styles.cardActionBtn}
            onPress={() => router.push('/(auth)/api-settings')}
          >
            <Text style={styles.cardActionText}>{th.settings.erpConfigure}</Text>
          </Pressable>
        }
      >
        <Text style={styles.codeBlock}>{erpApiUrl}</Text>
      </SettingsCard>

      <SettingsCard
        icon="volume-high-outline"
        title={th.settings.soundTitle}
        desc={th.settings.soundDesc}
      >
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{th.settings.soundOn}</Text>
          <Switch
            value={soundEnabled}
            onValueChange={(value) => void onSoundChange(value)}
            trackColor={{ false: colors.line, true: colors.accent }}
            thumbColor="#fff"
            accessibilityLabel={th.settings.soundToggleAria}
          />
        </View>
      </SettingsCard>

      <SettingsCard
        icon="print-outline"
        title={th.settings.printTitle}
        desc={th.settings.printOrgHint}
      >
        {org ? (
          <Text style={styles.orgLine}>
            {org.company} / {org.branch}
          </Text>
        ) : null}

        <Text style={styles.fieldLabel}>{th.settings.labelTemplate}</Text>
        <Text style={styles.readonly}>{LABEL_TEMPLATE_LABEL}</Text>

        <AppDropdown
          label={th.settings.packingTemplate}
          placeholder={th.settings.packingTemplate}
          value={printSettings.packingTemplateId}
          options={PACKING_TEMPLATE_OPTIONS.map((option) => ({
            label: option.label,
            value: option.id,
          }))}
          onValueChange={(value) =>
            updatePrint('packingTemplateId', value as PackingTemplateId)
          }
        />

        <Text style={styles.fieldLabel}>{th.settings.labelPrinter}</Text>
        <TextInput
          style={styles.input}
          value={printSettings.labelPrinterName}
          onChangeText={(value) => updatePrint('labelPrinterName', value)}
          placeholder={th.settings.printerExampleZebra}
        />

        <Text style={styles.fieldLabel}>{th.settings.a4Printer}</Text>
        <TextInput
          style={styles.input}
          value={printSettings.a4PrinterName}
          onChangeText={(value) => updatePrint('a4PrinterName', value)}
          placeholder={th.settings.printerExampleHp}
        />
      </SettingsCard>

      <SettingsCard
        icon="scan-outline"
        title={th.scanInput.settingsLabel}
        desc={th.scanInput.dialogHint}
      >
        <AppDropdown
          label={th.scanInput.settingsLabel}
          placeholder={th.scanInput.settingsLabel}
          value={scanInputMode === 'keyboard' ? 'scanner' : scanInputMode}
          options={[
            { label: th.scanInput.scannerTitle, value: 'scanner' },
            { label: th.scanInput.cameraTitle, value: 'camera' },
          ]}
          onValueChange={(value) => void onScanModeChange(value as ScanInputMode)}
        />
      </SettingsCard>

      <AppButton
        title={th.nav.logout}
        variant="danger"
        onPress={() => {
          Alert.alert(th.nav.logout, 'ต้องการออกจากระบบหรือไม่?', [
            { text: 'ยกเลิก', style: 'cancel' },
            {
              text: th.nav.logout,
              style: 'destructive',
              onPress: () => void logout().then(() => router.replace('/(auth)/login')),
            },
          ]);
        }}
        fullWidth
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { color: colors.muted, textAlign: 'center', padding: 24 },
  headerActions: { alignItems: 'flex-end', gap: 6 },
  savedNotice: { color: colors.ok, fontSize: 12, fontWeight: '600' },
  card: { gap: 10 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitles: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  cardDesc: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  cardActionBtn: {
    minHeight: minTouch,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
  },
  cardActionText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
  codeBlock: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.bgAccent,
    borderRadius: radius.md,
    padding: 10,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: minTouch,
  },
  switchLabel: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  orgLine: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 4,
  },
  readonly: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.bgAccent,
    borderRadius: radius.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    minHeight: minTouch,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    fontSize: 15,
    color: colors.ink,
  },
});
