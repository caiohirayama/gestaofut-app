import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import { CashTransactionRow } from './CashTransactionRow';

const GROUP_ID = 'group-1';

function cashTransaction(overrides: Partial<financeEndpoints.CashTransaction> = {}): financeEndpoints.CashTransaction {
  return {
    id: 'cash-1',
    groupId: GROUP_ID,
    type: 'EXPENSE',
    category: 'BALLS',
    description: 'Bolas novas',
    amount: '60.00',
    occurredAt: '2026-03-05T00:00:00.000Z',
    createdByUserId: 'admin-1',
    paymentId: null,
    status: 'CONFIRMED',
    createdAt: '2026-03-05T00:00:00.000Z',
    cancelledAt: null,
    ...overrides,
  };
}

function renderRow(item: financeEndpoints.CashTransaction, canManage: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CashTransactionRow groupId={GROUP_ID} cashTransaction={item} currency="BRL" canManage={canManage} />
    </QueryClientProvider>,
  );
}

/** Drives the "Estornar lançamento" confirmation Alert by pressing the given button label. */
function autoConfirmAlert(buttonLabel = 'Estornar') {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((b) => b.text === buttonLabel)?.onPress?.();
  });
}

describe('CashTransactionRow', () => {
  it('shows the category, description, date, amount and status', () => {
    renderRow(cashTransaction(), false);

    expect(screen.getByText('Bolas')).toBeTruthy();
    expect(screen.getByText('Bolas novas')).toBeTruthy();
    expect(screen.getByText('- R$ 60,00')).toBeTruthy();
    expect(screen.getByText('Confirmado')).toBeTruthy();
  });

  it('shows a "+" prefix for INCOME and a "-" prefix for EXPENSE', () => {
    renderRow(cashTransaction({ type: 'INCOME', amount: '150.00' }), false);

    expect(screen.getByText('+ R$ 150,00')).toBeTruthy();
  });

  describe('PERMISSIONS: "somente finance.manage cria despesas manuais" — estorno gated the same way', () => {
    it('hides "Estornar" for a viewer without finance.manage', () => {
      renderRow(cashTransaction(), false);

      expect(screen.queryByRole('button', { name: 'Estornar' })).toBeNull();
    });

    it('shows "Estornar" for a CONFIRMED, manually recorded entry when the viewer can manage finance', () => {
      renderRow(cashTransaction(), true);

      expect(screen.getByRole('button', { name: 'Estornar' })).toBeTruthy();
    });

    it('hides "Estornar" for an already-CANCELLED entry, even with finance.manage', () => {
      renderRow(cashTransaction({ status: 'CANCELLED' }), true);

      expect(screen.queryByRole('button', { name: 'Estornar' })).toBeNull();
    });
  });

  describe('CANCELAMENTO: "não permitir delete simples, usar cancelamento/estorno"', () => {
    it('shows a hint instead of an action for a payment-linked entry — the API rejects a direct cancel', () => {
      renderRow(cashTransaction({ type: 'INCOME', paymentId: 'payment-1' }), true);

      expect(screen.queryByRole('button', { name: 'Estornar' })).toBeNull();
      expect(screen.getByText('Gerado por um pagamento — estorne o pagamento para cancelar.')).toBeTruthy();
    });

    it('asks for confirmation before estornando ("confirmar operações financeiras importantes")', () => {
      const alertSpy = autoConfirmAlert('Cancelar'); // dismiss path: nothing should fire
      const cancelSpy = jest.spyOn(financeEndpoints, 'cancelCashTransaction');

      renderRow(cashTransaction(), true);
      fireEvent.press(screen.getByRole('button', { name: 'Estornar' }));

      expect(alertSpy).toHaveBeenCalledWith('Estornar lançamento', expect.any(String), expect.any(Array));
      expect(cancelSpy).not.toHaveBeenCalled();
    });

    it('calls cancelCashTransaction only after the confirmation is accepted', async () => {
      autoConfirmAlert('Estornar');
      const cancelSpy = jest.spyOn(financeEndpoints, 'cancelCashTransaction').mockResolvedValue({ ...cashTransaction(), status: 'CANCELLED' });

      renderRow(cashTransaction(), true);
      fireEvent.press(screen.getByRole('button', { name: 'Estornar' }));

      await waitFor(() => expect(cancelSpy).toHaveBeenCalledWith(GROUP_ID, 'cash-1'));
    });

    it('never deletes — there is no delete action anywhere on the row', () => {
      renderRow(cashTransaction(), true);

      expect(screen.queryByRole('button', { name: /excluir/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /deletar/i })).toBeNull();
    });
  });

  it('shows an inline error message when the estorno fails', async () => {
    autoConfirmAlert('Estornar');
    jest.spyOn(financeEndpoints, 'cancelCashTransaction').mockRejectedValue(new Error('network error'));

    renderRow(cashTransaction(), true);
    fireEvent.press(screen.getByRole('button', { name: 'Estornar' }));

    expect(await screen.findByText('Não foi possível estornar o lançamento. Tente novamente.')).toBeTruthy();
  });
});
