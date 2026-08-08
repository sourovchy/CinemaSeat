// Types mirror the actual backend response shapes from
// src/catalog/routes.js, src/booking/routes.js, src/payment/routes.js.
// Backend status strings are the only legal values; the frontend does not
// invent additional states.

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

// Frontend-only overlay status for seats the user has clicked. Never sent
// to the backend as a separate status; backend only knows AVAILABLE/HELD/BOOKED.
export type UiSeatStatus = SeatStatus | 'SELECTED';

export interface Movie {
  id: number;
  title: string;
  duration_min: number;
  rating: string;
  description: string;
}

export interface Theatre {
  id: number;
  name: string;
  city: string;
}

export interface Show {
  id: number;
  movie_id: number;
  movie_title: string;
  theatre_id: number;
  theatre_name: string;
  city: string;
  screen_id: number;
  screen_name: string;
  starts_at: string;
  price_cents: number;
}

export interface Seat {
  seat_id: number;
  row_label: string;
  seat_number: number;
  status: SeatStatus;
}

export interface SeatMapSummary {
  available: number;
  held: number;
  booked: number;
}

export interface SeatMap {
  show_id: number;
  seats: Seat[];
  summary: SeatMapSummary;
}

export interface HoldRequest {
  seat_ids: number[];
  customer_name: string;
  customer_phone: string;
}

export interface HoldResponse {
  booking_ref: string;
  booking_id: number;
  show_id: number;
  seat_ids: number[];
  status: 'HELD';
  amount_cents: number;
  hold_ttl_seconds: number;
  hold_expires_at: string;
}

// Booking status values returned by GET /api/bookings/:ref (and inferred
// in the hold response). EXPIRED is computed from a HELD booking whose
// hold_expires_at is in the past.
export type BookingStatus =
  | 'HELD'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'EXPIRED';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export interface BookingPayment {
  attempt_ref: string;
  status: PaymentStatus;
  gateway_payment_id: string | null;
}

export interface Booking {
  booking_ref: string;
  show_id: number;
  customer_name: string;
  status: BookingStatus;
  seat_ids: number[];
  amount_cents: number;
  hold_expires_at: string;
  otp_verified: boolean;
  payment: BookingPayment | null;
  created_at: string;
}

export interface OtpSendResponse {
  status: 'SENT';
  note: string;
}

export interface OtpVerifyResponse {
  verified: true;
}

export interface PaymentInitiationResponse {
  booking_ref: string;
  attempt_ref: string;
  status: 'PAYMENT_PENDING';
  note: string;
}

export interface AppConfig {
  hold_ttl_seconds: number;
  sweep_interval_seconds: number;
  otp_required: boolean;
}

// Domain error codes surfaced by the backend.
export type DomainErrorCode =
  | 'VALIDATION'
  | 'INVALID_SHOW_ID'
  | 'SHOW_NOT_FOUND'
  | 'BOOKING_NOT_FOUND'
  | 'UNKNOWN_SEATS'
  | 'SEAT_UNAVAILABLE'
  | 'BOOKING_NOT_PAYABLE'
  | 'ALREADY_CONFIRMED'
  | 'PAYMENT_IN_PROGRESS'
  | 'HOLD_EXPIRED'
  | 'OTP_REQUIRED'
  | 'OTP_INVALID'
  | 'OTP_TOO_MANY_ATTEMPTS'
  | 'OTP_SEND_FAILED'
  | 'GATEWAY_UNAVAILABLE'
  | 'GATEWAY_ERROR'
  | 'BAD_REQUEST'
  | 'INTERNAL';

export interface ApiErrorPayload {
  error?: DomainErrorCode | string;
  message?: string;
  status?: BookingStatus | string;
  unavailable_seat_ids?: number[];
  unknown_seat_ids?: number[];
  retryable?: boolean;
  note?: string;
}