import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { th } from '@scan-goods/shared';
import {
  formatQty,
  statusBadgeTone,
  type AggregatedItemLine,
} from '@scan-goods/shared/utils/scanItemUtils';
import { StatusBadge, type StatusTone } from './StatusBadge';
import { colors, radius } from '../theme/colors';

const TABLE_MIN_WIDTH = 1040;

const COLUMNS = [
  { key: 'barcode', label: th.scan.colBarcode, width: 100, align: 'left' as const },
  { key: 'sku', label: th.scan.colSku, width: 80, align: 'left' as const },
  { key: 'name', label: th.scan.colName, width: 200, align: 'left' as const },
  { key: 'unit', label: th.scan.colUnit, width: 60, align: 'left' as const },
  { key: 'pack', label: th.scan.colPack, width: 60, align: 'right' as const },
  { key: 'docQty', label: th.scan.colDocQty, width: 70, align: 'right' as const },
  { key: 'scanned', label: th.scan.colScanned, width: 70, align: 'right' as const },
  { key: 'remaining', label: th.scan.colRemaining, width: 70, align: 'right' as const },
  { key: 'status', label: th.scan.colStatus, width: 90, align: 'left' as const },
  { key: 'docRef', label: th.scan.colDocRef, width: 120, align: 'left' as const },
];

function toneToBadge(tone: ReturnType<typeof statusBadgeTone>): StatusTone {
  if (tone === 'done') return 'ok';
  if (tone === 'partial') return 'warn';
  return 'muted';
}

interface ScanItemLinesTableProps {
  itemLines: AggregatedItemLine[];
}

function HeaderRow() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      {COLUMNS.map((col) => (
        <View key={col.key} style={[styles.cell, { width: col.width }]}>
          <Text
            style={[
              styles.headerText,
              col.align === 'right' && styles.textRight,
            ]}
            numberOfLines={2}
          >
            {col.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DataRow({ item }: { item: AggregatedItemLine }) {
  return (
    <View style={styles.row}>
      <View style={[styles.cell, { width: COLUMNS[0].width }]}>
        <Text style={styles.cellText}>{item.barcode}</Text>
      </View>
      <View style={[styles.cell, { width: COLUMNS[1].width }]}>
        <Text style={styles.cellText}>{item.skuCode}</Text>
      </View>
      <View style={[styles.cell, { width: COLUMNS[2].width }]}>
        <Text style={styles.cellText}>{item.skuName}</Text>
      </View>
      <View style={[styles.cell, { width: COLUMNS[3].width }]}>
        <Text style={styles.cellText}>{item.unitName}</Text>
      </View>
      <View style={[styles.cell, { width: COLUMNS[4].width }]}>
        <Text style={[styles.cellText, styles.textRight]}>
          {formatQty(item.packSize)}
        </Text>
      </View>
      <View style={[styles.cell, { width: COLUMNS[5].width }]}>
        <Text style={[styles.cellText, styles.textRight]}>
          {formatQty(item.documentQty)}
        </Text>
      </View>
      <View style={[styles.cell, { width: COLUMNS[6].width }]}>
        <Text style={[styles.cellText, styles.textRight]}>
          {formatQty(item.scanQty)}
        </Text>
      </View>
      <View style={[styles.cell, { width: COLUMNS[7].width }]}>
        <Text style={[styles.cellText, styles.textRight]}>
          {formatQty(item.remainingQty)}
        </Text>
      </View>
      <View style={[styles.cell, { width: COLUMNS[8].width }]}>
        <StatusBadge
          label={item.status}
          tone={toneToBadge(statusBadgeTone(item.status))}
        />
      </View>
      <View style={[styles.cell, { width: COLUMNS[9].width }]}>
        <Text style={styles.cellText}>{item.sourceDiRef}</Text>
      </View>
    </View>
  );
}

export function ScanItemLinesTable({ itemLines }: ScanItemLinesTableProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        {th.scan.remainingTitle} ({itemLines.length})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={styles.horizontalScroll}
        contentContainerStyle={styles.horizontalContent}
      >
        <View style={styles.table}>
          <HeaderRow />
          <FlatList
            data={itemLines}
            keyExtractor={(item) => item.lineKey}
            renderItem={({ item }) => <DataRow item={item} />}
            nestedScrollEnabled
            style={styles.list}
            contentContainerStyle={itemLines.length === 0 ? styles.emptyList : undefined}
            ListEmptyComponent={
              <Text style={styles.emptyText}>ไม่มีรายการคงเหลือ</Text>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
  },
  horizontalScroll: { flex: 1 },
  horizontalContent: { flexGrow: 1 },
  table: {
    minWidth: TABLE_MIN_WIDTH,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.panel,
  },
  list: { flex: 1 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  emptyText: { color: colors.muted, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
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
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.line,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  cellText: {
    fontSize: 13,
    color: colors.ink,
  },
  textRight: { textAlign: 'right' },
});
