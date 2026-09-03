import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ErpError,
  formatDisplayDate,
  loadSessionFromDiKeys,
  parseDisplayDate,
  searchDocumentsFromErp,
  th,
  validateDocumentFilters,
  type DocumentListItem,
} from '@scan-goods/shared';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { Card } from '../../src/components/Card';
import { DocumentRefInput } from '../../src/components/DocumentRefInput';
import { StatusBadge } from '../../src/components/StatusBadge';
import { useAuthStore } from '../../src/store/authStore';
import { usePackingStore } from '../../src/store/packingStore';
import { colors, minTouch, radius } from '../../src/theme/colors';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatParty(doc: DocumentListItem) {
  if (doc.partyCode) {
    return `${doc.partyCode} ${doc.partyName ?? ''}`.trim();
  }
  return doc.partyName || '-';
}

export default function DocumentsScreen() {
  const loginGuid = useAuthStore((s) => s.loginGuid);
  const setSession = usePackingStore((s) => s.setSession);
  const setSelectedDocs = usePackingStore((s) => s.setSelectedDocs);
  const selectedDocs = usePackingStore((s) => s.selectedDocs);

  const [docs, setDocs] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [fromRef, setFromRef] = useState('');
  const [toRef, setToRef] = useState('');
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);
  const [fromDateText, setFromDateText] = useState(() => formatDisplayDate(todayIso()));
  const [toDateText, setToDateText] = useState(() => formatDisplayDate(todayIso()));

  const selectedKeys = useMemo(
    () => new Set(selectedDocs.map((d) => d.diKey)),
    [selectedDocs],
  );
  const allSelected =
    docs.length > 0 && docs.every((doc) => selectedKeys.has(doc.diKey));

  const handleFromDateBlur = () => {
    const parsed = parseDisplayDate(fromDateText);
    if (parsed) {
      setFromDate(parsed);
      setFromDateText(formatDisplayDate(parsed));
      return;
    }
    setFromDateText(formatDisplayDate(fromDate));
  };

  const handleToDateBlur = () => {
    const parsed = parseDisplayDate(toDateText);
    if (parsed) {
      setToDate(parsed);
      setToDateText(formatDisplayDate(parsed));
      return;
    }
    setToDateText(formatDisplayDate(toDate));
  };

  const resetFilters = () => {
    const today = todayIso();
    const todayDisplay = formatDisplayDate(today);
    setFromRef('');
    setToRef('');
    setFromDate(today);
    setToDate(today);
    setFromDateText(todayDisplay);
    setToDateText(todayDisplay);
    setDocs([]);
    setSelectedDocs([]);
    setNotice(null);
  };

  const search = async () => {
    if (!loginGuid) return;

    const parsedFromDate = parseDisplayDate(fromDateText);
    const parsedToDate = parseDisplayDate(toDateText);
    if (!parsedFromDate || !parsedToDate) {
      setNotice(th.documents.dateInvalid);
      return;
    }

    setFromDate(parsedFromDate);
    setToDate(parsedToDate);
    setFromDateText(formatDisplayDate(parsedFromDate));
    setToDateText(formatDisplayDate(parsedToDate));

    const validation = validateDocumentFilters({
      fromDate: parsedFromDate,
      toDate: parsedToDate,
      fromRef,
      toRef,
    });
    if (validation) {
      setNotice(validation);
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      const result = await searchDocumentsFromErp(loginGuid, {
        fromDate: parsedFromDate,
        toDate: parsedToDate,
        fromRef: fromRef.trim() || undefined,
        toRef: toRef.trim() || undefined,
      });
      setDocs(result);
      setSelectedDocs(result);
      if (!result.length) {
        setNotice(th.documents.notFound);
      }
    } catch (error) {
      setNotice(
        error instanceof ErpError ? error.message : th.documents.searchFailed,
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleDoc = (doc: DocumentListItem) => {
    if (selectedKeys.has(doc.diKey)) {
      setSelectedDocs(selectedDocs.filter((d) => d.diKey !== doc.diKey));
    } else {
      setSelectedDocs([...selectedDocs, doc]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedDocs([]);
      return;
    }
    setSelectedDocs(docs);
  };

  const startPacking = async () => {
    if (!loginGuid || selectedDocs.length === 0) {
      Alert.alert('แจ้งเตือน', th.documents.selectAtLeastOne);
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const session = await loadSessionFromDiKeys(
        loginGuid,
        selectedDocs.map((d) => d.diKey),
      );
      if (!session.documents.length || !session.items.length) {
        setNotice(th.documents.noLineItems);
        return;
      }
      await setSession(session);
      router.push('/(tabs)/scan');
    } catch (error) {
      setNotice(
        error instanceof ErpError ? error.message : th.documents.loadFailed,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title={th.documents.title} subtitle={th.documents.eyebrow}>
      <Card>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.label}>{th.documents.fromDate}</Text>
            <TextInput
              style={styles.input}
              value={fromDateText}
              onChangeText={setFromDateText}
              onBlur={handleFromDateBlur}
              placeholder={th.documents.datePlaceholder}
              inputMode="numeric"
              editable={!loading}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.label}>{th.documents.toDate}</Text>
            <TextInput
              style={styles.input}
              value={toDateText}
              onChangeText={setToDateText}
              onBlur={handleToDateBlur}
              placeholder={th.documents.datePlaceholder}
              inputMode="numeric"
              editable={!loading}
            />
          </View>
        </View>

        <DocumentRefInput
          label={th.documents.fromRef}
          value={fromRef}
          onChangeText={setFromRef}
          placeholder={th.documents.fromRefPlaceholder}
          disabled={loading}
        />
        <DocumentRefInput
          label={th.documents.toRef}
          value={toRef}
          onChangeText={setToRef}
          placeholder={th.documents.toRefPlaceholder}
          disabled={loading}
        />

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <View style={styles.row}>
          <AppButton
            title={loading ? th.documents.searching : th.documents.search}
            onPress={() => void search()}
            disabled={loading}
          />
          <AppButton
            title="ล้างค่า"
            variant="secondary"
            onPress={resetFilters}
            disabled={loading}
          />
        </View>
      </Card>

      <Card>
        <View style={styles.listHeader}>
          <Text style={styles.count}>
            {th.documents.listTitle} ({docs.length}) · เลือก {selectedDocs.length} ฉบับ
          </Text>
          {docs.length > 0 ? (
            <Pressable onPress={toggleAll} style={styles.selectAllBtn}>
              <Ionicons
                name={allSelected ? 'checkbox' : 'square-outline'}
                size={20}
                color={colors.accent}
              />
              <Text style={styles.selectAllText}>
                {allSelected ? 'ยกเลิกทั้งหมด' : th.documents.selectAllAria}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {docs.length === 0 ? (
          <Text style={styles.empty}>{th.documents.emptyTable}</Text>
        ) : null}

        {docs.map((doc) => {
          const selected = selectedKeys.has(doc.diKey);
          return (
            <Pressable
              key={doc.diKey}
              onPress={() => toggleDoc(doc)}
              style={[styles.docRow, selected && styles.docSelected]}
            >
              <Ionicons
                name={selected ? 'checkbox' : 'square-outline'}
                size={22}
                color={selected ? colors.accent : colors.muted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.docRef}>{doc.diRef}</Text>
                <Text style={styles.docMeta}>
                  {formatDisplayDate(doc.diDate)} · {formatParty(doc)}
                </Text>
              </View>
              <StatusBadge label={doc.workflowStatus} tone="info" />
            </Pressable>
          );
        })}
      </Card>

      <AppButton
        title={`${th.documents.startPacking} (${selectedDocs.length})`}
        onPress={() => void startPacking()}
        disabled={loading || selectedDocs.length === 0}
        fullWidth
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    minHeight: minTouch,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 15,
    color: colors.ink,
  },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dateField: { flex: 1 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  notice: { color: colors.danger, fontSize: 13, marginBottom: 8 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  count: { flex: 1, color: colors.muted, fontSize: 13 },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: minTouch,
    paddingHorizontal: 4,
  },
  selectAllText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  empty: { color: colors.muted, fontSize: 14, marginBottom: 8 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  docSelected: { borderColor: colors.accent, backgroundColor: colors.infoBg },
  docRef: { fontWeight: '700', color: colors.ink },
  docMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
