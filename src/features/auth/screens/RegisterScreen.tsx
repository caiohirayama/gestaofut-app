import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { spacing } from '@/theme';
import { PasswordInput } from '../components/PasswordInput';
import { useRegister } from '../hooks/useRegister';
import { getAuthErrorMessage } from '../utils/auth-error-message';
import { registerSchema, type RegisterFormValues } from '../schemas/register-schema';

export function RegisterScreen() {
  const registerMutation = useRegister();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: RegisterFormValues) {
    try {
      await registerMutation.mutateAsync(values);
      router.replace({ pathname: '/(auth)/login', params: { registered: '1' } });
    } catch {
      // surfaced via registerMutation.error below
    }
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">Criar conta</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xs }}>
          Crie sua conta para começar a gerenciar seu grupo.
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Nome"
              placeholder="Seu nome completo"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
          )}
        />

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
            <PasswordInput
              label="Senha"
              placeholder="••••••••"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { value, onChange, onBlur } }) => (
            <PasswordInput
              label="Confirmar senha"
              placeholder="••••••••"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />

        {registerMutation.isError ? (
          <Text variant="caption" color="danger" accessibilityRole="alert">
            {getAuthErrorMessage(registerMutation.error)}
          </Text>
        ) : null}

        <Button
          label="Criar conta"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting || registerMutation.isPending}
          disabled={!isValid}
        />

        <Text
          variant="label"
          color="primary"
          style={{ textAlign: 'center', marginTop: spacing.sm }}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          Já tem conta? Entrar
        </Text>
      </View>
    </Screen>
  );
}
