import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { th } from '@scan-goods/shared';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { Card } from '../../src/components/Card';
import { useAuthStore } from '../../src/store/authStore';
import { colors } from '../../src/theme/colors';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      router.replace('/(auth)/select-org');
    } catch (error) {
      Alert.alert(th.auth.failed, error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title={th.auth.loginTitle}
      subtitle={th.auth.loginHint}
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={th.auth.apiSettingsAria}
          onPress={() => router.push('/(auth)/api-settings')}
          hitSlop={12}
        >
          <Ionicons name="settings-outline" size={24} color={colors.sidebar} />
        </Pressable>
      }
    >
      <Card style={styles.brandCard}>
        <Text style={styles.brandTitle}>{th.app.name}</Text>
        <Text style={styles.brandSub}>{th.auth.tagline}</Text>
        <Text style={styles.brandDesc}>{th.auth.descLine1}</Text>
      </Card>

      <Card>
        <Text style={styles.label}>{th.auth.username}</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder={th.auth.usernamePlaceholder}
          autoCapitalize="none"
        />
        <Text style={styles.label}>{th.auth.password}</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={th.auth.passwordPlaceholder}
          secureTextEntry
        />
        <AppButton
          title={loading ? th.auth.submitting : th.auth.submit}
          onPress={onSubmit}
          fullWidth
        />
      </Card>

      <Text style={styles.footer}>{th.app.companyFooter}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandCard: { backgroundColor: colors.sidebar },
  brandTitle: { color: '#fff', fontSize: 28, fontWeight: '700' },
  brandSub: { color: colors.sidebarText, fontSize: 16 },
  brandDesc: { color: colors.sidebarText, fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 12 },
});
