import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as pushPermissionModule from '../utils/push-permission';
import { usePushPermission } from './usePushPermission';

describe('usePushPermission — ESTADOS', () => {
  it('starts loading, then resolves to the current OS status', async () => {
    jest.spyOn(pushPermissionModule, 'getPushPermissionStatus').mockResolvedValue('undetermined');

    const { result } = renderHook(() => usePushPermission());

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('undetermined'));
  });

  it('request() prompts and updates status to the result', async () => {
    jest.spyOn(pushPermissionModule, 'getPushPermissionStatus').mockResolvedValue('undetermined');
    const requestSpy = jest.spyOn(pushPermissionModule, 'requestPushPermission').mockResolvedValue('granted');

    const { result } = renderHook(() => usePushPermission());
    await waitFor(() => expect(result.current.status).toBe('undetermined'));

    let returned: string | undefined;
    await act(async () => {
      returned = await result.current.request();
    });

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(returned).toBe('granted');
    expect(result.current.status).toBe('granted');
  });

  it('refresh() re-reads the OS status without prompting', async () => {
    const getStatusSpy = jest.spyOn(pushPermissionModule, 'getPushPermissionStatus').mockResolvedValue('denied');
    const requestSpy = jest.spyOn(pushPermissionModule, 'requestPushPermission');

    const { result } = renderHook(() => usePushPermission());
    await waitFor(() => expect(result.current.status).toBe('denied'));

    getStatusSpy.mockResolvedValueOnce('granted');
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe('granted');
    expect(requestSpy).not.toHaveBeenCalled();
  });
});
