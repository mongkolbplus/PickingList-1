import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, minTouch, radius } from '../theme/colors';

export interface DropdownOption {
  label: string;
  value: string;
}

interface AppDropdownProps {
  label: string;
  placeholder: string;
  value: string;
  options: DropdownOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  emptyText?: string;
}

export function AppDropdown({
  label,
  placeholder,
  value,
  options,
  onValueChange,
  disabled = false,
  emptyText,
}: AppDropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  const onSelect = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || options.length === 0}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          (disabled || options.length === 0) && styles.fieldDisabled,
        ]}
      >
        <Text
          style={[styles.fieldText, !selected && styles.placeholder]}
          numberOfLines={1}
        >
          {selected?.label ?? (options.length === 0 ? emptyText ?? placeholder : placeholder)}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={styles.list}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    onPress={() => onSelect(item.value)}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {item.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.accent} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
            <Pressable onPress={() => setOpen(false)} style={styles.cancel}>
              <Text style={styles.cancelText}>ปิด</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 4,
  },
  field: {
    minHeight: minTouch,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fieldDisabled: { opacity: 0.6 },
  fieldText: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
  },
  placeholder: { color: colors.muted },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: { maxHeight: 320 },
  option: {
    minHeight: minTouch,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  optionActive: { backgroundColor: colors.infoBg },
  optionText: { fontSize: 15, color: colors.ink, flex: 1 },
  optionTextActive: { color: colors.accent, fontWeight: '600' },
  cancel: {
    minHeight: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
});
