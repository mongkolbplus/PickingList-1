import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppButton } from './AppButton';
import { colors, minTouch, radius } from '../theme/colors';

interface DocumentRefInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DocumentRefInput({
  label,
  value,
  onChangeText,
  placeholder,
  disabled = false,
}: DocumentRefInputProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const openCamera = async () => {
    if (disabled) return;
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('ต้องการสิทธิ์กล้อง', 'เปิดสิทธิ์กล้องเพื่อสแกนบาร์โค้ดเอกสาร');
        return;
      }
    }
    setShowCamera(true);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!disabled}
        />
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => void openCamera()}
          style={[styles.cameraBtn, disabled && styles.cameraBtnDisabled]}
        >
          <Ionicons name="barcode-outline" size={22} color="#fff" />
        </Pressable>
      </View>

      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'code128', 'qr'],
            }}
            onBarcodeScanned={({ data }) => {
              onChangeText(data);
              setShowCamera(false);
            }}
          />
          <View style={styles.cameraFooter}>
            <AppButton title="ปิดกล้อง" variant="secondary" onPress={() => setShowCamera(false)} fullWidth />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    minHeight: minTouch,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: '#fff',
  },
  inputDisabled: { opacity: 0.6 },
  cameraBtn: {
    width: minTouch,
    height: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtnDisabled: { opacity: 0.5 },
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraFooter: { padding: 16, backgroundColor: colors.bg },
});
