import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  formatDisplayDate,
  th,
  type DocumentListItem,
} from '@scan-goods/shared';
import { StatusBadge } from './StatusBadge';
import { colors, minTouch, radius } from '../theme/colors';

const TABLE_MIN_WIDTH = 640;

const COLUMNS = [
  { key: 'select', label: '', width: 44, align: 'center' as const },
  { key: 'ref', label: th.documents.colRef, width: 120, align: 'left' as const },
  { key: 'date', label: th.documents.colDate, width: 96, align: 'left' as const },
  { key: 'customer', label: th.documents.colCustomer, width: 240, align: 'left' as const },
  { key: 'status', label: th.documents.colStatus, width: 110, align: 'left' as const },
];

function formatParty(doc: DocumentListItem) {
  if (doc.partyCode) {
    return `${doc.partyCode} ${doc.partyName ?? ''}`.trim();
  }
  return doc.partyName || '-';
}

interface DocumentListTableProps {
  docs: DocumentListItem[];
  selectedKeys: Set<number>;
  allSelected: boolean;
  someSelected: boolean;
  disabled?: boolean;
  onToggle: (doc: DocumentListItem) => void;
  onToggleAll: () => void;
}

function HeaderRow({
  allSelected,
  someSelected,
  disabled,
  onToggleAll,
}: Pick<DocumentListTableProps, 'allSelected' | 'someSelected' | 'disabled' | 'onToggleAll'>) {
  const iconName = allSelected
    ? 'checkbox'
    : someSelected
      ? 'remove-outline'
      : 'square-outline';

  return (
    <View style={[styles.row, styles.headerRow]}>
      {COLUMNS.map((col) => (
        <View
          key={col.key}
          style={[
            styles.cell,
            { width: col.width },
            col.align === 'center' && styles.cellCenter,
          ]}
        >
          {col.key === 'select' ? (
            <Pressable
              onPress={onToggleAll}
              disabled={disabled}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: allSelected }}
              accessibilityLabel={th.documents.selectAllAria}
              style={styles.checkboxBtn}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={allSelected || someSelected ? colors.accent : colors.muted}
              />
            </Pressable>
          ) : (
            <Text style={styles.headerText} numberOfLines={2}>
              {col.label}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function DataRow({
  doc,
  selected,
  disabled,
  onToggle,
}: {
  doc: DocumentListItem;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <View style={[styles.cell, styles.cellCenter, { width: COLUMNS[0].width }]}>
        <Ionicons
          name={selected ? 'checkbox' : 'square-outline'}
          size={22}
          color={selected ? colors.accent : colors.muted}
        />
      </View>
      <View style={[styles.cell, { width: COLUMNS[1].width }]}>
        <Text style={styles.cellTextStrong}>{doc.diRef}</Text>
      </View>
      <View style={[styles.cell, { width: COLUMNS[2].width }]}>
        <Text style={styles.cellText}>{formatDisplayDate(doc.diDate)}</Text>
      </View>
      <View style={[styles.cell, { width: COLUMNS[3].width }]}>
        <Text style={styles.cellText}>{formatParty(doc)}</Text>
      </View>
      <View style={[styles.cell, { width: COLUMNS[4].width }]}>
        <StatusBadge label={doc.workflowStatus} tone="info" />
      </View>
    </Pressable>
  );
}

export function DocumentListTable({
  docs,
  selectedKeys,
  allSelected,
  someSelected,
  disabled,
  onToggle,
  onToggleAll,
}: DocumentListTableProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      style={styles.horizontalScroll}
      contentContainerStyle={styles.horizontalContent}
    >
      <View style={styles.table}>
        <HeaderRow
          allSelected={allSelected}
          someSelected={someSelected}
          disabled={disabled || docs.length === 0}
          onToggleAll={onToggleAll}
        />
        <FlatList
          data={docs}
          keyExtractor={(item) => String(item.diKey)}
          renderItem={({ item }) => (
            <DataRow
              doc={item}
              selected={selectedKeys.has(item.diKey)}
              disabled={disabled}
              onToggle={() => onToggle(item)}
            />
          )}
          nestedScrollEnabled
          scrollEnabled={docs.length > 8}
          style={docs.length > 8 ? styles.listScroll : undefined}
          ListEmptyComponent={
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>{th.documents.emptyTable}</Text>
            </View>
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  horizontalScroll: { flexGrow: 0 },
  horizontalContent: { flexGrow: 1 },
  table: {
    minWidth: TABLE_MIN_WIDTH,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.panel,
  },
  listScroll: { maxHeight: 420 },
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    backgroundColor: '#fff',
  },
  rowSelected: {
    backgroundColor: colors.infoBg,
  },
  headerRow: {
    backgroundColor: colors.bgAccent,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  cellCenter: {
    alignItems: 'center',
  },
  checkboxBtn: {
    minWidth: minTouch,
    minHeight: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  cellText: {
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18,
  },
  cellTextStrong: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 18,
  },
  emptyRow: {
    padding: 24,
    minWidth: TABLE_MIN_WIDTH,
  },
  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 14,
  },
});
