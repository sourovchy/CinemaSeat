import { apiClient } from './client';
import type {
  Booking,
  HoldRequest,
  HoldResponse,
  OtpSendResponse,
  OtpVerifyResponse,
  PaymentInitiationResponse,
} from '../types/api';

export const bookingsApi = {
  hold: (showId: number, body: HoldRequest) =>
    apiClient.request<HoldResponse>(`/shows/${showId}/hold`, {
      method: 'POST',
      body,
    }),

  get: (ref: string) =>
    apiClient.request<Booking>(`/bookings/${encodeURIComponent(ref)}`),
};

export const paymentsApi = {
  sendOtp: (ref: string) =>
    apiClient.request<OtpSendResponse>(
      `/bookings/${encodeURIComponent(ref)}/otp/send`,
      { method: 'POST' },
    ),

  verifyOtp: (ref: string, code: string) =>
    apiClient.request<OtpVerifyResponse>(
      `/bookings/${encodeURIComponent(ref)}/otp/verify`,
      { method: 'POST', body: { code } },
    ),

  pay: (ref: string) =>
    apiClient.request<PaymentInitiationResponse>(
      `/bookings/${encodeURIComponent(ref)}/pay`,
      { method: 'POST' },
    ),
};

export const configApi = {
  get: () =>
    apiClient.request<{
      hold_ttl_seconds: number;
      sweep_interval_seconds: number;
      otp_required: boolean;
    }>('/config'),
};