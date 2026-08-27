import { apiFetch } from '../client';

/** Mirrors the `user` object shape returned by gestaofut-api (see docs/auth.md there). */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'BLOCKED' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function register(input: RegisterInput): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

export function login(input: LoginInput): Promise<AuthResult> {
  return apiFetch<AuthResult>('/auth/login', { method: 'POST', body: input, auth: false });
}

export function refresh(refreshToken: string): Promise<AuthResult> {
  return apiFetch<AuthResult>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    auth: false,
  });
}

/** Requires a valid access token: the API scopes the revoked session to the caller. */
export function logout(refreshToken: string): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST', body: { refreshToken } });
}

export function getMe(signal?: AbortSignal): Promise<AuthUser> {
  return apiFetch<AuthUser>('/me', { signal });
}
