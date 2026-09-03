import { View, type ViewProps } from 'react-native';
import { common } from '../theme/common';

export function Card({ style, ...props }: ViewProps) {
  return <View style={[common.card, style]} {...props} />;
}
