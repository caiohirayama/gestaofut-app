import { useState } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, type InputProps } from '@/components/ui';
import { colors } from '@/theme';

/**
 * `Input` preconfigured for passwords: masks by default with a visibility
 * toggle. Lives under `features/auth` (not `components/ui`) because it's the
 * only place a password field exists today — promote it if a second one
 * shows up (e.g. change-password).
 */
export function PasswordInput(props: Omit<InputProps, 'secureTextEntry' | 'rightAccessory'>) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      secureTextEntry={!visible}
      textContentType={props.textContentType ?? 'password'}
      rightAccessory={
        <Pressable
          onPress={() => setVisible((current) => !current)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      }
    />
  );
}
