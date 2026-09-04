import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { clampQty, parseQtyInput } from '@scan-goods/shared/utils/qtyUtils';
import { colors, minTouch, radius } from '../theme/colors';

interface QtyStepperProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  label?: string;
}

export function QtyStepper({
  value,
  onChange,
  disabled = false,
  min = 1,
  max,
  label,
}: QtyStepperProps) {
  const [input, setInput] = useState(String(value));

  useEffect(() => {
    setInput(String(value));
  }, [value]);

  const commitInput = (raw = input) => {
    const next = clampQty(parseQtyInput(raw, value), min, max);
    setInput(String(next));
    onChange(next);
  };

  const step = (delta: number) => {
    const next = clampQty(value + delta, min, max);
    setInput(String(next));
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled || value <= min}
          onPress={() => step(-1)}
          style={[styles.btn, disabled && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>−</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          value={input}
          inputMode="numeric"
          editable={!disabled}
          onChangeText={(text) => {
            const next = text.replace(/[^\d]/g, '');
            setInput(next);
            if (next) onChange(clampQty(parseQtyInput(next, value), min, max));
          }}
          onBlur={() => commitInput()}
        />
        <Pressable
          accessibilityRole="button"
          disabled={disabled || (max != null && value >= max)}
          onPress={() => step(1)}
          style={[styles.btn, disabled && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minWidth: 120 },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 20, color: colors.ink, lineHeight: 22 },
  input: {
    minWidth: 44,
    minHeight: 36,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    textAlign: 'center',
    fontSize: 16,
    color: colors.ink,
    backgroundColor: '#fff',
    paddingHorizontal: 4,
  },
});
