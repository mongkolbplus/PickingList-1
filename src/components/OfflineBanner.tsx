import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/colors';

interface OfflineBannerProps {
  pendingCount: number;
  isOnline: boolean;
  onRetry?: () => void;
}

export function OfflineBanner({ pendingCount, isOnline, onRetry }: OfflineBannerProps) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <View style={[styles.banner, !isOnline && styles.offline]}>
      <Text style={styles.text}>
        {!isOnline
          ? `ออฟไลน์ — รอส่ง ${pendingCount} รายการ`
          : `กำลังส่งคิวที่ค้าง ${pendingCount} รายการ`}
      </Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>ลองส่งอีกครั้ง</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warnBg,
    borderBottomWidth: 1,
    borderColor: colors.warn,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  offline: { backgroundColor: '#fff0e6' },
  text: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '600' },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
