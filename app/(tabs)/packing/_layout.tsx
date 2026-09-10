import { Stack } from 'expo-router';

export default function PackingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="scan" />
      <Stack.Screen name="confirm" options={{ presentation: 'modal' }} />
      <Stack.Screen name="print" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
