import { useLocalSearchParams } from 'expo-router';
import { EventFormScreen } from '@/features/events/screens/EventFormScreen';

export default function EditEvent() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  return <EventFormScreen eventId={eventId} />;
}
