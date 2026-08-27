import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing, touchTarget } from '@/theme';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, helperText, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="label" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        style={[styles.input, focused && styles.inputFocused, hasError && styles.inputError, style]}
        placeholderTextColor={colors.textTertiary}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        accessibilityState={{ disabled: rest.editable === false }}
        {...rest}
      />
      {hasError ? (
        <Text variant="caption" color="danger" style={styles.helper}>
          {error}
        </Text>
      ) : helperText ? (
        <Text variant="caption" color="textTertiary" style={styles.helper}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    marginLeft: spacing.xs,
  },
  input: {
    minHeight: touchTarget.min,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.danger,
  },
  helper: {
    marginLeft: spacing.xs,
  },
});
