import { render, screen } from '@testing-library/react-native';
import type { Dashboard } from '@/services/api/endpoints/dashboard';
import { AdminAlertsCard } from './AdminAlertsCard';

describe('AdminAlertsCard', () => {
  it('renders nothing at all when there is nothing to flag', () => {
    const { toJSON } = render(<AdminAlertsCard dashboard={{ alerts: {} }} currency="BRL" />);

    expect(toJSON()).toBeNull();
  });

  it('renders the applicable lines inside a single card', () => {
    const dashboard: Dashboard = {
      alerts: { pendingConfirmations: 2 },
      nextEvent: { id: 'e1', type: 'BARBECUE', title: 'Churrasco', startsAt: '', endsAt: '', status: 'OPEN', confirmed: 18 },
    };
    render(<AdminAlertsCard dashboard={dashboard} currency="BRL" />);

    expect(screen.getByText('⚠️ 2 confirmações pendentes')).toBeTruthy();
    expect(screen.getByText('🔥 Churrasco · 18 confirmados')).toBeTruthy();
  });
});
