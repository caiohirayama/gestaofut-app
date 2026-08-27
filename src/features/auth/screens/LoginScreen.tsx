import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { SECURE_KEYS, setSecureItem } from '@/services/secure-storage';
import { useAuthStore } from '@/store/auth-store';
import { spacing } from '@/theme';
import { delay } from '@/utils/delay';
import { loginSchema, type LoginFormValues } from '../schemas/login-schema';

export function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  // Stub only: gestaofut-api doesn't expose real authentication yet. This
  // proves the form/validation/SecureStore/session-store/navigation wiring
  // end to end, and is meant to be replaced by a real POST /api/v1/auth/login.
  async function onSubmit(values: LoginFormValues) {
    void values;
    await delay(500);
    const stubToken = 'stub-token';
    await setSecureItem(SECURE_KEYS.authToken, stubToken);
    signIn(stubToken);
    router.replace('/(app)');
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">Entrar</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xs }}>
          Acesse sua conta para gerenciar seu grupo.
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="E-mail"
              placeholder="voce@email.com"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Senha"
              placeholder="••••••••"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
            />
          )}
        />

        <Button
          label="Entrar"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={!isValid}
        />
      </View>
    </Screen>
  );
}
