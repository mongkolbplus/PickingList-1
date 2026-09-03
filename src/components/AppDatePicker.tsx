import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { formatDisplayDate } from '@scan-goods/shared';
import { colors, minTouch, radius } from '../theme/colors';

export function isoToDate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return new Date();
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, month, day);
}

function dateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface AppDatePickerProps {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function AppDatePicker({
  label,
  value,
  onChange,
  disabled = false,
  minimumDate,
  maximumDate,
}: AppDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => isoToDate(value));

  const displayValue = useMemo(() => formatDisplayDate(value), [value]);

  const openPicker = () => {
    if (disabled) return;
    setDraft(isoToDate(value));
    setOpen(true);
  };

  const commitDate = (date: Date) => {
    onChange(dateToIso(date));
    setOpen(false);
  };

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === 'set' && date) {
      onChange(dateToIso(date));
    }
  };

  const onIosChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setDraft(date);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={openPicker}
        style={[styles.field, disabled && styles.fieldDisabled]}
      >
        <Text style={styles.fieldText}>{displayValue}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.muted} />
      </Pressable>

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={onAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable
              style={styles.sheet}
              onPress={(event) => event.stopPropagation()}
            >
              <Text style={styles.sheetTitle}>{label}</Text>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                locale="th-TH"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={onIosChange}
                style={styles.iosPicker}
              />
              <View style={styles.actions}>
                <Pressable onPress={() => setOpen(false)} style={styles.actionBtn}>
                  <Text style={styles.cancelText}>ยกเลิก</Text>
                </Pressable>
                <Pressable
                  onPress={() => commitDate(draft)}
                  style={styles.actionBtn}
                >
                  <Text style={styles.doneText}>ตกลง</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textAlign: 'center',
  },
  iosPicker: { alignSelf: 'stretch' },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  actionBtn: {
    flex: 1,
    minHeight: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
  },
});
