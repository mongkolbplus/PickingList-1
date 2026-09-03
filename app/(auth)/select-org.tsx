import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { th } from '@scan-goods/shared';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { AppDropdown } from '../../src/components/AppDropdown';
import { Card } from '../../src/components/Card';
import { useAuthStore } from '../../src/store/authStore';
import { colors } from '../../src/theme/colors';

export default function SelectOrgScreen() {
  const {
    companyName,
    branches,
    warehouses,
    loadOrgLookups,
    setOrg,
    logout,
  } = useAuthStore();
  const [branchKey, setBranchKey] = useState('');
  const [warehouseKey, setWarehouseKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadOrgLookups().catch((e) =>
      Alert.alert('ข้อผิดพลาด', e instanceof Error ? e.message : String(e)),
    );
  }, [loadOrgLookups]);

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        label: branch.branchName,
        value: branch.branchKey,
      })),
    [branches],
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        label: warehouse.warehouseName,
        value: warehouse.warehouseKey,
      })),
    [warehouses],
  );

  const onSubmit = async () => {
    const branch = branches.find((b) => b.branchKey === branchKey);
    const warehouse = warehouses.find((w) => w.warehouseKey === warehouseKey);
    if (!branch) {
      Alert.alert('แจ้งเตือน', th.org.requireBranch);
      return;
    }
    if (!warehouse) {
      Alert.alert('แจ้งเตือน', th.org.requireWarehouse);
      return;
    }
    setLoading(true);
    try {
      await setOrg({
        company: companyName || 'บริษัท',
        branch: branch.branchName,
        branchKey: branch.branchKey,
        warehouse: warehouse.warehouseName,
        warehouseKey: warehouse.warehouseKey,
      });
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title={th.org.title} subtitle={th.org.descLine1}>
      <Card>
        <Text style={styles.label}>{th.org.company}</Text>
        <Text style={styles.value}>{companyName || '-'}</Text>

        <AppDropdown
          label={th.org.branch}
          placeholder={th.org.branchPlaceholder}
          value={branchKey}
          options={branchOptions}
          onValueChange={setBranchKey}
          emptyText={th.org.noBranch}
        />

        <AppDropdown
          label={th.org.warehouse}
          placeholder={th.org.warehousePlaceholder}
          value={warehouseKey}
          options={warehouseOptions}
          onValueChange={setWarehouseKey}
          emptyText={th.org.noWarehouse}
        />

        <AppButton
          title={loading ? th.org.submitting : th.org.submit}
          onPress={onSubmit}
          fullWidth
        />
        <AppButton
          title={th.org.backToLogin}
          variant="ghost"
          onPress={() => logout().then(() => router.replace('/(auth)/login'))}
          fullWidth
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 4 },
  value: { fontSize: 16, color: colors.ink, marginBottom: 12 },
});
