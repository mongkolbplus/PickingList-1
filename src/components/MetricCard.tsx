import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { colors } from '../theme/colors';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'blue' | 'green' | 'orange' | 'red' | 'navy';
}

const toneColors = {
  blue: colors.infoBg,
  green: colors.okBg,
  orange: colors.warnBg,
  red: colors.dangerBg,
  navy: '#e8edf7',
};

export function MetricCard({ title, value, unit, icon, tone = 'blue' }: MetricCardProps) {
  return (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: toneColors[tone] }]}>
        <Ionicons name={icon} size={20} color={colors.ink} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: '45%' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 12, color: colors.muted },
  value: { fontSize: 22, fontWeight: '700', color: colors.ink },
  unit: { fontSize: 14, fontWeight: '500', color: colors.muted },
});
