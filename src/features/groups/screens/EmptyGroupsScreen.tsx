import { EmptyState, Screen } from '@/components/ui';

/** Shown when the caller belongs to no group and can't create one either (e.g. a plain MEMBER waiting to be added). */
export function EmptyGroupsScreen() {
  return (
    <Screen>
      <EmptyState
        title="Nenhum grupo ainda"
        message="Você ainda não faz parte de nenhum grupo. Peça para o organizador te adicionar."
      />
    </Screen>
  );
}
