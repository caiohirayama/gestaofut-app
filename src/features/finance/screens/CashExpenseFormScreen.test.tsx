import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as financeEndpoints from '@/services/api/endpoints/finance';
import { useGroupStore } from '@/store/group-store';
import { CashExpenseFormScreen } from './CashExpenseFormScreen';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: (...args: unknown[]) => mockBack(...args) },
}));

function cashTransactionFixture(overrides: Partial<financeEndpoints.CashTransaction> = {}): financeEndpoints.CashTransaction {
  return {
    id: 'cash-1',
    groupId: 'group-1',
    type: 'EXPENSE',
    category: 'BALLS',
    description: null,
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

function renderScreen() {
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CashExpenseFormScreen />
    </QueryClientProvider>,
  );
}

describe('CashExpenseFormScreen — "+ Nova despesa" / "+ Novo lançamento"', () => {
  it('submits a manual EXPENSE (never INCOME — there is no type field) and navigates back on success', async () => {
    const createSpy = jest.spyOn(financeEndpoints, 'createManualCashExpense').mockResolvedValue(cashTransactionFixture());

    renderScreen();

    fireEvent.press(screen.getByText('Bolas'));
    fireEvent.changeText(screen.getByPlaceholderText('60,00'), '60,00');
    fireEvent(screen.getByPlaceholderText('60,00'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('Detalhes da despesa (opcional)'), 'Bolas novas');
    fireEvent(screen.getByPlaceholderText('Detalhes da despesa (opcional)'), 'blur');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar despesa' }).props.accessibilityState.disabled).toBe(false));
    fireEvent.press(screen.getByRole('button', { name: 'Registrar despesa' }));

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith('group-1', {
        category: 'BALLS',
        amount: '60.00',
        description: 'Bolas novas',
        occurredAt: undefined,
      }),
    );
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('omits occurredAt (server defaults to "hoje") when the date field is left blank', async () => {
    const createSpy = jest.spyOn(financeEndpoints, 'createManualCashExpense').mockResolvedValue(cashTransactionFixture());

    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('60,00'), '10');
    fireEvent(screen.getByPlaceholderText('60,00'), 'blur');

    const submitButton = screen.getByRole('button', { name: 'Registrar despesa' });
    await waitFor(() => expect(submitButton.props.accessibilityState.disabled).toBe(false));
    fireEvent.press(submitButton);

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith('group-1', expect.objectContaining({ occurredAt: undefined })));
  });

  it('sends an explicit occurredAt when a valid DD/MM/AAAA date is given', async () => {
    const createSpy = jest.spyOn(financeEndpoints, 'createManualCashExpense').mockResolvedValue(cashTransactionFixture());

    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('60,00'), '10');
    fireEvent(screen.getByPlaceholderText('60,00'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('DD/MM/AAAA (padrão: hoje)'), '05/03/2026');
    fireEvent(screen.getByPlaceholderText('DD/MM/AAAA (padrão: hoje)'), 'blur');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar despesa' }).props.accessibilityState.disabled).toBe(false));
    fireEvent.press(screen.getByRole('button', { name: 'Registrar despesa' }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith('group-1', expect.objectContaining({ occurredAt: expect.any(String) })));
  });

  it('rejects a zero amount before ever calling the API', async () => {
    const createSpy = jest.spyOn(financeEndpoints, 'createManualCashExpense');

    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('60,00'), '0');
    fireEvent(screen.getByPlaceholderText('60,00'), 'blur');

    expect(await screen.findByText('Informe um valor positivo (ex.: 60,00)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Registrar despesa' }).props.accessibilityState.disabled).toBe(true);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('rejects a malformed date before ever calling the API', async () => {
    const createSpy = jest.spyOn(financeEndpoints, 'createManualCashExpense');

    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('60,00'), '10');
    fireEvent(screen.getByPlaceholderText('60,00'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('DD/MM/AAAA (padrão: hoje)'), '2026-03-05');
    fireEvent(screen.getByPlaceholderText('DD/MM/AAAA (padrão: hoje)'), 'blur');

    expect(await screen.findByText('Use o formato DD/MM/AAAA')).toBeTruthy();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('disables the submit button while the mutation is pending (double-submit guard)', async () => {
    let resolveCreate!: (value: financeEndpoints.CashTransaction) => void;
    jest.spyOn(financeEndpoints, 'createManualCashExpense').mockImplementation(() => new Promise((resolve) => (resolveCreate = resolve)));

    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('60,00'), '60,00');
    fireEvent(screen.getByPlaceholderText('60,00'), 'blur');

    const submitButton = screen.getByRole('button', { name: 'Registrar despesa' });
    await waitFor(() => expect(submitButton.props.accessibilityState.disabled).toBe(false));
    fireEvent.press(submitButton);

    await waitFor(() => expect(submitButton.props.accessibilityState.disabled).toBe(true));

    resolveCreate(cashTransactionFixture());
  });
});
