import { apiFetch } from '../client';

/** Mirrors the `user` object shape returned by gestaofut-api (see docs/auth.md there). */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'BLOCKED' | 'INACTIVE';
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Shared wire shape of every "request an upload URL" endpoint (mirrors gestaofut-api's `imageUploadUrlResponseSchema`) — see docs/uploads.md. */
export interface UploadUrlResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresAt: string;
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

/** Step 1 of the avatar upload flow — see docs/uploads.md. */
export function createAvatarUploadUrl(input: { contentType: string; contentLength: number }): Promise<UploadUrlResult> {
  return apiFetch<UploadUrlResult>('/me/avatar/upload-url', { method: 'POST', body: input });
}

/** Step 3: confirms the upload and returns the caller with `avatarUrl` set. */
export function confirmAvatarUpload(key: string): Promise<AuthUser> {
  return apiFetch<AuthUser>('/me/avatar/confirm', { method: 'POST', body: { key } });
}
