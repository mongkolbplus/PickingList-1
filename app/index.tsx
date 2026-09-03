import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

export default function Index() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const loginGuid = useAuthStore((s) => s.loginGuid);
  const org = useAuthStore((s) => s.org);

  if (!hydrated) return null;

  if (!loginGuid) return <Redirect href="/(auth)/login" />;
  if (!org) return <Redirect href="/(auth)/select-org" />;
  return <Redirect href="/(tabs)" />;
}
