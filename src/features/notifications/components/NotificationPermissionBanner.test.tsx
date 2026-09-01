import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { NotificationPermissionBanner } from './NotificationPermissionBanner';

describe('NotificationPermissionBanner — PERMISSION / REVOGAÇÃO', () => {
  it('undetermined: invites the user to enable, and requests permission on tap', () => {
    const onRequest = jest.fn();
    render(<NotificationPermissionBanner status="undetermined" onRequest={onRequest} isRequesting={false} onRevoke={jest.fn()} isRevoking={false} />);

    fireEvent.press(screen.getByRole('button', { name: 'Ativar notificações' }));

    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it('denied: never re-prompts the OS — sends the user to Settings instead', () => {
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const onRequest = jest.fn();
    render(<NotificationPermissionBanner status="denied" onRequest={onRequest} isRequesting={false} onRevoke={jest.fn()} isRevoking={false} />);

    fireEvent.press(screen.getByRole('button', { name: 'Abrir configurações' }));

    expect(openSettingsSpy).toHaveBeenCalledTimes(1);
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('granted: offers to revoke instead of asking to enable again', () => {
    const onRevoke = jest.fn();
    render(<NotificationPermissionBanner status="granted" onRequest={jest.fn()} isRequesting={false} onRevoke={onRevoke} isRevoking={false} />);

    expect(screen.getByText('Notificações por push ativadas')).toBeTruthy();
    fireEvent.press(screen.getByText('Desativar'));

    expect(onRevoke).toHaveBeenCalledTimes(1);
  });

  it('granted + revoking: disables the revoke action while in flight', () => {
    render(<NotificationPermissionBanner status="granted" onRequest={jest.fn()} isRequesting={false} onRevoke={jest.fn()} isRevoking />);

    expect(screen.getByText('Desativando...')).toBeTruthy();
  });

  it('undetermined + requesting: disables the enable button while in flight (shown as a spinner, no label)', () => {
    render(<NotificationPermissionBanner status="undetermined" onRequest={jest.fn()} isRequesting onRevoke={jest.fn()} isRevoking={false} />);

    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ disabled: true, busy: true });
  });
});
