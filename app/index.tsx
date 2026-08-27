import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';

/**
 * Authenticated users always land on `(group-setup)` first, never
 * `(app)` directly — it resolves which group (if any) is active and only
 * then forwards to `(app)`, auto-selecting when there's nothing to choose
 * (see GroupGateScreen).
 */
export default function Index() {
  const status = useAuthStore((state) => state.status);
  return <Redirect href={status === 'authenticated' ? '/(group-setup)' : '/(auth)/login'} />;
}
