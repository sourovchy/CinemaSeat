import type { ApiErrorPayload, DomainErrorCode } from '../types/api';

// The frontend uses relative '/api' by default (proxied by Vite in dev to
// http://127.0.0.1:3000), or VITE_API_BASE_URL if explicitly specified.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: DomainErrorCode | string;
  readonly payload: ApiErrorPayload | null;

  constructor(
    status: number,
    code: DomainErrorCode | string,
    message: string,
    payload: ApiErrorPayload | null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(opts.headers ?? {}),
  };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body,
      signal: opts.signal,
    });
  } catch (err) {
    // Network-level failure (backend down, DNS, CORS preflight rejection, …).
    throw new ApiError(
      0,
      'GATEWAY_UNAVAILABLE',
      'Unable to reach the server. Please check your connection and try again.',
      null,
    );
  }

  let payload: ApiErrorPayload | null = null;
  const text = await res.text();
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as ApiErrorPayload;
    } catch {
      // Non-JSON body — treat as opaque.
      payload = null;
    }
  }

  if (!res.ok) {
    const code = (payload?.error as DomainErrorCode | undefined) ?? defaultCodeForStatus(res.status);
    const message = payload?.message ?? defaultMessageForStatus(res.status, code);
    throw new ApiError(res.status, code, message, payload);
  }

  return payload as unknown as T;
}

function defaultCodeForStatus(status: number): DomainErrorCode {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 403) return 'OTP_REQUIRED';
  if (status === 404) return 'BOOKING_NOT_FOUND';
  if (status === 409) return 'BOOKING_NOT_PAYABLE';
  if (status === 429) return 'OTP_TOO_MANY_ATTEMPTS';
  if (status === 502) return 'OTP_SEND_FAILED';
  if (status === 503) return 'GATEWAY_UNAVAILABLE';
  return 'INTERNAL';
}

function defaultMessageForStatus(status: number, code: string): string {
  if (status === 0) return 'Network error.';
  if (status >= 500) return 'The server is temporarily unavailable. Please retry shortly.';
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 403) return 'This action is not allowed.';
  if (status === 400) return `Invalid request (${code}).`;
  return `Request failed (${code}).`;
}

export const apiClient = { request };