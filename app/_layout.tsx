import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { useOfflineQueue } from '../src/hooks/useOfflineQueue';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { View } from 'react-native';

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const { isOnline, pendingCount, retry } = useOfflineQueue();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner pendingCount={pendingCount} isOnline={isOnline} onRetry={retry} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/api-settings" />
        <Stack.Screen name="(auth)/select-org" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="packing/confirm" options={{ presentation: 'modal' }} />
        <Stack.Screen name="packing/print" options={{ presentation: 'modal' }} />
        <Stack.Screen name="history" />
        <Stack.Screen name="settings/roles" />
      </Stack>
    </View>
  );
}
