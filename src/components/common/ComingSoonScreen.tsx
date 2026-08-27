import { EmptyState, Screen } from '@/components/ui';

export interface ComingSoonScreenProps {
  title: string;
  message?: string;
}

/**
 * Placeholder for tabs whose real feature isn't built yet (Jogos, Jogadores,
 * Financeiro). Validates the tab navigation shell without implementing any
 * domain logic ahead of scope.
 */
export function ComingSoonScreen({ title, message = 'Em breve.' }: ComingSoonScreenProps) {
  return (
    <Screen>
      <EmptyState title={title} message={message} />
    </Screen>
  );
}
