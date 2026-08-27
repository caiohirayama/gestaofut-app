import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';

export default function Index() {
  const status = useAuthStore((state) => state.status);
  return <Redirect href={status === 'authenticated' ? '/(app)' : '/(auth)/login'} />;
}
