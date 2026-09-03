import { SafeAreaView, ScrollView, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { colors } from '../theme/colors';

interface ScreenProps extends ViewProps {
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function Screen({
  title,
  subtitle,
  scroll = true,
  headerRight,
  children,
  style,
}: ScreenProps) {
  const header = title ? (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {headerRight}
    </View>
  ) : null;

  if (scroll) {
    return (
      <SafeAreaView style={[styles.screen, style]}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, style]}>
      {header}
      <View style={[styles.content, { flex: 1 }]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.sidebar },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
});
