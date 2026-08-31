import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import type { GroupMember } from '@/services/api/endpoints/groups';
import { toFinanceListItems, type FinanceListItem } from '../utils/finance-summary';
import { PendingItemRow } from './PendingItemRow';

const GROUP_ID = 'group-1';

const member: GroupMember = {
  id: 'member-1',
  groupId: GROUP_ID,
  userId: 'user-1',
  membershipType: 'REGULAR',
  status: 'ACTIVE',
  joinedAt: '',
  leftAt: null,
};

function fee(overrides: Partial<financeEndpoints.MonthlyFee> = {}): financeEndpoints.MonthlyFee {
  return {
    id: 'fee-1',
    groupId: GROUP_ID,
    groupMemberId: 'member-1',
    referenceYear: 2026,
    referenceMonth: 3,
    amount: '150.00',
    dueDate: '2026-03-01',
    status: 'PENDING',
    createdAt: '2026-02-01T00:00:00.000Z',
    paidAt: null,
    ...overrides,
  };
}

function itemFor(feeOverrides: Partial<financeEndpoints.MonthlyFee> = {}): FinanceListItem {
  return toFinanceListItems([fee(feeOverrides)], [])[0]!;
}

function renderRow(item: FinanceListItem, canManage: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PendingItemRow groupId={GROUP_ID} item={item} members={[member]} currentUserId="someone-else" currency="BRL" canManage={canManage} />
    </QueryClientProvider>,
  );
}

/** Drives both sequential Alert.alert dialogs (method picker, then confirmation) by title. */
function autoConfirmAlerts(methodLabel = 'PIX') {
  return jest.spyOn(Alert, 'alert').mockImplementation((title, _message, buttons) => {
    if (title === 'Registrar pagamento') {
      buttons?.find((b) => b.text === methodLabel)?.onPress?.();
    } else if (title === 'Confirmar pagamento') {
      buttons?.find((b) => b.text === 'Confirmar')?.onPress?.();
    }
  });
}

describe('PendingItemRow', () => {
  it('shows the player name, description, amount and status', () => {
    renderRow(itemFor(), false);

    expect(screen.getByText('Jogador user-1')).toBeTruthy();
    expect(screen.getByText('Mensalidade — março de 2026')).toBeTruthy();
    expect(screen.getByText('R$ 150,00')).toBeTruthy();
    expect(screen.getByText('Pendente')).toBeTruthy();
  });

  it('hides the "Registrar pagamento" action for a viewer without finance.manage', () => {
    renderRow(itemFor(), false);

    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).toBeNull();
  });

  it('hides the action for an item that is not payable (already PAID)', () => {
    renderRow(itemFor({ status: 'PAID' }), true);

    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).toBeNull();
  });

  it('shows the action for an OVERDUE item when the viewer can manage finance', () => {
    renderRow(itemFor({ status: 'OVERDUE' }), true);

    expect(screen.getByRole('button', { name: 'Registrar pagamento' })).toBeTruthy();
  });

  it('asks for a payment method, then a confirmation, before recording ("solicitar confirmação")', async () => {
    const alertSpy = autoConfirmAlerts('PIX');
    const recordSpy = jest.spyOn(financeEndpoints, 'recordPayment').mockResolvedValue({
      id: 'payment-1',
      organizationId: 'org-1',
      groupId: GROUP_ID,
      payerUserId: member.userId,
      amount: '150.00',
      paymentMethod: 'PIX',
      status: 'PENDING',
      paidAt: null,
      createdAt: '2026-03-01T00:00:00.000Z',
      allocations: [],
    });
    jest.spyOn(financeEndpoints, 'confirmPayment').mockResolvedValue({
      id: 'payment-1',
      organizationId: 'org-1',
      groupId: GROUP_ID,
      payerUserId: member.userId,
      amount: '150.00',
      paymentMethod: 'PIX',
      status: 'CONFIRMED',
      paidAt: '2026-03-01T00:00:00.000Z',
      createdAt: '2026-03-01T00:00:00.000Z',
    });

    renderRow(itemFor(), true);
    fireEvent.press(screen.getByRole('button', { name: 'Registrar pagamento' }));

    expect(alertSpy).toHaveBeenCalledWith('Registrar pagamento', expect.any(String), expect.any(Array));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Confirmar pagamento', expect.stringMatching(/R\$\s*150,00/), expect.any(Array)),
    );
    await waitFor(() =>
      expect(recordSpy).toHaveBeenCalledWith(GROUP_ID, {
        payerUserId: 'user-1',
        paymentMethod: 'PIX',
        billables: [{ type: 'MONTHLY_FEE', id: 'fee-1' }],
      }),
    );
  });

  it('never records a payment when the method picker is dismissed without a choice', () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const recordSpy = jest.spyOn(financeEndpoints, 'recordPayment');

    renderRow(itemFor(), true);
    fireEvent.press(screen.getByRole('button', { name: 'Registrar pagamento' }));

    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('never records a payment when the final confirmation is cancelled', () => {
    jest.spyOn(Alert, 'alert').mockImplementation((title, _message, buttons) => {
      if (title === 'Registrar pagamento') {
        buttons?.find((b) => b.text === 'PIX')?.onPress?.();
      }
      // "Confirmar pagamento" dialog: simulate dismiss — no button pressed.
    });
    const recordSpy = jest.spyOn(financeEndpoints, 'recordPayment');

    renderRow(itemFor(), true);
    fireEvent.press(screen.getByRole('button', { name: 'Registrar pagamento' }));

    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('disables the button while the mutation is in flight (double-submit guard)', async () => {
    autoConfirmAlerts('PIX');
    let resolveRecord!: (value: financeEndpoints.PaymentWithAllocations) => void;
    jest.spyOn(financeEndpoints, 'recordPayment').mockImplementation(() => new Promise((resolve) => (resolveRecord = resolve)));

    renderRow(itemFor(), true);
    const button = screen.getByRole('button', { name: 'Registrar pagamento' });
    fireEvent.press(button);

    await waitFor(() => expect(button.props.accessibilityState.disabled).toBe(true));

    resolveRecord({
      id: 'payment-1',
      organizationId: 'org-1',
      groupId: GROUP_ID,
      payerUserId: member.userId,
      amount: '150.00',
      paymentMethod: 'PIX',
      status: 'PENDING',
      paidAt: null,
      createdAt: '2026-03-01T00:00:00.000Z',
      allocations: [],
    });
  });

  it('shows an inline error message when recording fails', async () => {
    autoConfirmAlerts('PIX');
    jest.spyOn(financeEndpoints, 'recordPayment').mockRejectedValue(new Error('network error'));

    renderRow(itemFor(), true);
    fireEvent.press(screen.getByRole('button', { name: 'Registrar pagamento' }));

    expect(await screen.findByText('Não foi possível registrar o pagamento. Tente novamente.')).toBeTruthy();
  });
});
