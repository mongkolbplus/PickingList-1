import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { colors, minTouch, radius } from '../theme/colors';

interface ScanBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  onCameraPress?: () => void;
}

export function ScanBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'สแกนบาร์โค้ดสินค้า',
  onCameraPress,
}: ScanBarProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>สแกนบาร์โค้ดสินค้า</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
        {onCameraPress ? (
          <Pressable style={styles.cameraBtn} onPress={onCameraPress}>
            <Ionicons name="barcode-outline" size={24} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    minHeight: minTouch,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.ink,
  },
  cameraBtn: {
    width: minTouch,
    height: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
