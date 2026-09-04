import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ScanSession } from '@scan-goods/shared';
import {
  getAvailableLots,
  sortLots,
  validateLotForScan,
  validateSerialForScan,
  type LotPolicy,
} from '@scan-goods/shared/utils/serialLotUtils';
import { AppButton } from './AppButton';
import { colors, minTouch, radius } from '../theme/colors';

interface SerialLotCaptureProps {
  mode: 'lot' | 'serial' | null;
  session: ScanSession;
  goodsCode: string;
  skuName: string;
  qty: number;
  onConfirmLot: (lotNo: string) => void;
  onConfirmSerial: (serialNo: string) => void;
  onCancel: () => void;
}

export function SerialLotCapture({
  mode,
  session,
  goodsCode,
  skuName,
  qty,
  onConfirmLot,
  onConfirmSerial,
  onCancel,
}: SerialLotCaptureProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<LotPolicy>('FIFO');

  const lots = useMemo(() => {
    if (mode !== 'lot') return [];
    return sortLots(getAvailableLots(session, goodsCode), policy);
  }, [mode, session, goodsCode, policy]);

  useEffect(() => {
    if (!mode) return;
    setValue('');
    setError(null);
  }, [mode, goodsCode]);

  if (!mode) return null;

  const submitLot = (lotNo: string) => {
    const check = validateLotForScan(session, goodsCode, lotNo, qty);
    if (!check.ok) {
      setError(check.message ?? lotNo);
      return;
    }
    onConfirmLot(lotNo.trim());
  };

  const submitSerial = (serialNo: string) => {
    const check = validateSerialForScan(session, goodsCode, serialNo);
    if (!check.ok) {
      setError(check.message ?? serialNo);
      return;
    }
    onConfirmSerial(serialNo.trim());
  };

  const onConfirm = () => {
    const raw = value.trim();
    if (!raw) return;
    if (mode === 'lot') submitLot(raw.replace(/^\$/, ''));
    else submitSerial(raw.replace(/^%/, ''));
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>สินค้า</Text>
            <Text style={styles.title}>
              {mode === 'lot' ? 'เลือก Lot' : 'สแกน Serial Number'}
            </Text>
            <Text style={styles.subtitle}>
              {skuName} ({goodsCode})
            </Text>
          </View>
          <Pressable onPress={onCancel} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {mode === 'lot' ? (
          <View style={styles.policyRow}>
            <Text style={styles.policyLabel}>นโยบาย Lot</Text>
            <View style={styles.policyBtns}>
              <Pressable
                onPress={() => setPolicy('FIFO')}
                style={[styles.policyBtn, policy === 'FIFO' && styles.policyBtnActive]}
              >
                <Text style={policy === 'FIFO' ? styles.policyTextActive : styles.policyText}>
                  FIFO
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPolicy('FEFO')}
                style={[styles.policyBtn, policy === 'FEFO' && styles.policyBtnActive]}
              >
                <Text style={policy === 'FEFO' ? styles.policyTextActive : styles.policyText}>
                  FEFO
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => {
            setValue(text);
            setError(null);
          }}
          placeholder={
            mode === 'lot' ? 'สแกน Lot หรือพิมพ์ Lot' : 'สแกน Serial Number'
          }
          autoCapitalize="none"
          autoCorrect={false}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {mode === 'lot' ? (
          <FlatList
            data={lots}
            keyExtractor={(item) => item.lotNo}
            style={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>ไม่มี Lot ในเอกสาร — สแกนหรือพิมพ์ Lot</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.lotRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lotNo}>{item.lotNo}</Text>
                  <Text style={styles.lotMeta}>
                    คงเหลือ {item.qtyOnHand}
                    {item.expDate ? ` · หมดอายุ ${item.expDate}` : ''}
                  </Text>
                </View>
                <AppButton
                  title="ยืนยัน"
                  onPress={() => submitLot(item.lotNo)}
                  style={{ paddingHorizontal: 12 }}
                />
              </View>
            )}
          />
        ) : null}

        <View style={styles.footer}>
          <AppButton title="ยกเลิก" variant="secondary" onPress={onCancel} />
          <AppButton title="ยืนยัน" onPress={onConfirm} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 16, paddingTop: 48 },
  header: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  eyebrow: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
  closeBtn: {
    width: minTouch,
    height: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 22, color: colors.muted },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  policyLabel: { fontSize: 13, color: colors.ink, fontWeight: '600' },
  policyBtns: { flexDirection: 'row', gap: 8 },
  policyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fff',
  },
  policyBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  policyText: { color: colors.ink, fontWeight: '600' },
  policyTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    minHeight: minTouch,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: colors.ink,
    marginBottom: 8,
  },
  error: { color: colors.danger, marginBottom: 8 },
  list: { flex: 1, marginBottom: 12 },
  lotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  lotNo: { fontWeight: '700', color: colors.ink },
  lotMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { color: colors.muted, paddingVertical: 16 },
  footer: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
});
