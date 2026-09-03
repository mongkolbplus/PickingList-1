import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/colors';

export type StatusTone = 'ok' | 'warn' | 'danger' | 'info' | 'muted';

const toneMap: Record<StatusTone, { bg: string; fg: string }> = {
  ok: { bg: colors.okBg, fg: colors.ok },
  warn: { bg: colors.warnBg, fg: colors.warn },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  info: { bg: colors.infoBg, fg: colors.info },
  muted: { bg: colors.bgAccent, fg: colors.muted },
};

export function StatusBadge({ label, tone = 'info' }: { label: string; tone?: StatusTone }) {
  const t = toneMap[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  text: { fontSize: 12, fontWeight: '600' },
});
