import { View } from 'react-native';
import { colors, radius } from '@/theme';

export interface ProgressBarProps {
  /** 0 to 1. Values outside that range are clamped. */
  progress: number;
}

/** A minimal determinate progress bar — used for upload progress (see docs/uploads.md). */
export function ProgressBar({ progress }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View
      style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View style={{ width: `${clamped * 100}%`, height: '100%', backgroundColor: colors.primary }} />
    </View>
  );
}
