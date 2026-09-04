import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ErpError,
  formatDisplayDate,
  loadSessionFromDiKeys,
  searchDocumentsFromErp,
  th,
  validateDocumentFilters,
  type DocumentListItem,
} from '@scan-goods/shared';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { AppDatePicker, isoToDate } from '../../src/components/AppDatePicker';
import { Card } from '../../src/components/Card';
import { DocumentRefInput } from '../../src/components/DocumentRefInput';
import { StatusBadge } from '../../src/components/StatusBadge';
import { useAuthStore } from '../../src/store/authStore';
import { usePackingStore } from '../../src/store/packingStore';
import { acquireDocumentLocks } from '../../src/services/documentLock';
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

function logStartPacking(step: string, detail?: Record<string, unknown>) {
  const payload = detail ? ` ${JSON.stringify(detail)}` : '';
  console.log(`[StartPacking] ${step}${payload}`);
}

export default function DocumentsScreen() {
  const loginGuid = useAuthStore((s) => s.loginGuid);
  const username = useAuthStore((s) => s.username);
  const startSession = usePackingStore((s) => s.startSession);
  const setSelectedDocs = usePackingStore((s) => s.setSelectedDocs);
  const selectedDocs = usePackingStore((s) => s.selectedDocs);

  const [docs, setDocs] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [fromRef, setFromRef] = useState('');
  const [toRef, setToRef] = useState('');
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);

  const selectedKeys = useMemo(
    () => new Set(selectedDocs.map((d) => d.diKey)),
    [selectedDocs],
  );
  const allSelected =
    docs.length > 0 && docs.every((doc) => selectedKeys.has(doc.diKey));

  const resetFilters = () => {
    const today = todayIso();
    setFromRef('');
    setToRef('');
    setFromDate(today);
    setToDate(today);
    setDocs([]);
    setSelectedDocs([]);
    setNotice(null);
  };

  const search = async () => {
    const validation = validateDocumentFilters({
      fromDate,
      toDate,
      fromRef,
      toRef,
    });
    if (validation) {
      setNotice(validation);
      return;
    }
    if (!loginGuid) {
      setNotice(th.auth.relogin);
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      const result = await searchDocumentsFromErp(loginGuid, {
        fromDate,
        toDate,
        fromRef: fromRef || undefined,
        toRef: toRef || undefined,
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
    if (!loginGuid) {
      logStartPacking('aborted', { reason: 'no-login-guid' });
      return;
    }

    const keys = selectedDocs.map((doc) => doc.diKey);
    const docRefs = selectedDocs.map((doc) => doc.diRef);
    logStartPacking('pressed', {
      username: username ?? 'user',
      selectedCount: keys.length,
      diKeys: keys,
      docRefs,
    });

    if (!keys.length) {
      logStartPacking('aborted', { reason: 'no-documents-selected' });
      setNotice(th.documents.selectAtLeastOne);
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      logStartPacking('loadSessionFromDiKeys', { diKeys: keys });
      const session = await loadSessionFromDiKeys(loginGuid, keys);
      logStartPacking('loadSessionFromDiKeys:done', {
        sessionId: session.sessionId,
        documentCount: session.documents.length,
        itemCount: session.items.length,
        documentRefs: session.documents.map((doc) => doc.diRef),
      });

      if (!session.documents.length || !session.items.length) {
        logStartPacking('aborted', {
          reason: 'no-line-items',
          sessionId: session.sessionId,
        });
        setNotice(th.documents.noLineItems);
        return;
      }

      const lockResult = await acquireDocumentLocks(
        keys,
        session.sessionId,
        username ?? 'user',
      );
      if (!lockResult.ok) {
        const refs = lockResult.conflicts
          .map((lock) => {
            const doc = session.documents.find((d) => d.diKey === lock.diKey);
            return doc?.diRef ?? String(lock.diKey);
          })
          .join(', ');
        logStartPacking('aborted', {
          reason: 'document-locked',
          sessionId: session.sessionId,
          conflicts: lockResult.conflicts.map((lock) => ({
            diKey: lock.diKey,
            username: lock.username,
            sessionId: lock.sessionId,
          })),
        });
        setNotice(
          `เอกสารถูกล็อกอยู่: ${refs} (${lockResult.conflicts[0]?.username})`,
        );
        return;
      }

      logStartPacking('acquireDocumentLocks:ok', { sessionId: session.sessionId });
      await startSession(session, username ?? undefined);
      logStartPacking('startSession:done', {
        sessionId: session.sessionId,
        activePartyCode: session.activePartyCode ?? null,
        currentBoxNo: session.currentBoxNo,
        navigateTo: '/packing/scan',
      });
      router.push('/packing/scan');
    } catch (error) {
      logStartPacking('error', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof ErpError ? 'ErpError' : error instanceof Error ? error.name : 'unknown',
      });
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
          <AppDatePicker
            label={th.documents.fromDate}
            value={fromDate}
            onChange={setFromDate}
            disabled={loading}
            maximumDate={isoToDate(toDate)}
          />
          <AppDatePicker
            label={th.documents.toDate}
            value={toDate}
            onChange={setToDate}
            disabled={loading}
            minimumDate={isoToDate(fromDate)}
          />
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
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  notice: { color: colors.danger, fontSize: 13, marginBottom: 8 },
  count: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: minTouch,
    paddingHorizontal: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
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
