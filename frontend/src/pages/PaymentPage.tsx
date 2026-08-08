import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { configApi, paymentsApi } from '../api/bookings';
import { showsApi } from '../api/catalog';
import { ApiError } from '../api/client';
import { useBookingPolling } from '../hooks/useBookingPolling';
import { useAsync } from '../hooks/useAsync';
import { LoadingState, ErrorState } from '../components/States';
import { HoldCountdown } from '../components/HoldCountdown';
import { OtpForm } from '../components/OtpForm';
import { PaymentStatusView } from '../components/PaymentStatusView';
import type { HoldResponse, Show } from '../types/api';

interface PersistedHold {
  booking_ref: string;
  hold_expires_at: string;
  amount_cents: number;
  seat_ids: number[];
  show_id: number;
}

function loadPersistedHold(ref: string): PersistedHold | null {
  try {
    const raw = sessionStorage.getItem(`cinemaseat:booking:${ref}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HoldResponse;
    return {
      booking_ref: parsed.booking_ref,
      hold_expires_at: parsed.hold_expires_at,
      amount_cents: parsed.amount_cents,
      seat_ids: parsed.seat_ids,
      show_id: parsed.show_id,
    };
  } catch {
    return null;
  }
}

export function PaymentPage() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const bookingRef = ref ?? '';

  const persisted = useMemo(
    () => (bookingRef ? loadPersistedHold(bookingRef) : null),
    [bookingRef],
  );

  const config = useAsync(() => configApi.get(), []);
  const showState = useAsync(
    async () => {
      const shows = (await showsApi.list()).shows;
      return shows;
    },
    [persisted?.show_id ?? 0],
  );
  const show: Show | null = useMemo(() => {
    if (!showState.data || !persisted) return null;
    return showState.data.find((s) => s.id === persisted.show_id) ?? null;
  }, [showState.data, persisted]);

  const booking = useBookingPolling(
    bookingRef,
    Boolean(bookingRef) && config.data?.otp_required !== undefined,
    { intervalMs: 1500, maxAttempts: 80 },
  );

  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const otpRequired = config.data?.otp_required ?? true;

  // Once polling hits a terminal CONFIRMED/FAILED/EXPIRED, navigate to the
  // dedicated page so the URL reflects the final state.
  useEffect(() => {
    if (!booking.booking) return;
    if (booking.booking.status === 'CONFIRMED') {
      navigate(`/bookings/${encodeURIComponent(bookingRef)}/confirmed`, {
        replace: true,
      });
    } else if (booking.booking.status === 'FAILED') {
      navigate(`/bookings/${encodeURIComponent(bookingRef)}/failed`, {
        replace: true,
      });
    } else if (booking.booking.status === 'EXPIRED') {
      navigate(`/bookings/${encodeURIComponent(bookingRef)}/expired`, {
        replace: true,
      });
    }
  }, [booking.booking, bookingRef, navigate]);

  const handleSendOtp = useCallback(async () => {
    if (!bookingRef) return;
    setOtpError(null);
    setOtpSending(true);
    try {
      await paymentsApi.sendOtp(bookingRef);
      setOtpSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setOtpError(err.message);
      } else {
        setOtpError('Failed to send OTP.');
      }
    } finally {
      setOtpSending(false);
    }
  }, [bookingRef]);

  const handleVerifyOtp = useCallback(
    async (code: string) => {
      if (!bookingRef) return;
      setOtpError(null);
      setOtpVerifying(true);
      try {
        await paymentsApi.verifyOtp(bookingRef, code);
        // Polling will pick up the new otp_verified state automatically.
      } catch (err) {
        if (err instanceof ApiError) {
          setOtpError(err.message);
        } else {
          setOtpError('Failed to verify OTP.');
        }
      } finally {
        setOtpVerifying(false);
      }
    },
    [bookingRef],
  );

  const handlePay = useCallback(async () => {
    if (!bookingRef) return;
    setPaymentError(null);
    setPaymentMessage(null);
    setPaying(true);
    try {
      const result = await paymentsApi.pay(bookingRef);
      setPaymentMessage(
        `${result.note ?? 'Payment pending.'} (attempt ${result.attempt_ref})`,
      );
      // Booking will transition to PAYMENT_PENDING; polling continues.
    } catch (err) {
      if (err instanceof ApiError) {
        setPaymentError(err.message);
      } else {
        setPaymentError('Failed to start payment.');
      }
    } finally {
      setPaying(false);
    }
  }, [bookingRef]);

  if (!bookingRef) {
    return <ErrorState title="Missing booking reference" message="No booking was specified." />;
  }

  if (config.loading) {
    return <LoadingState label="Loading booking…" />;
  }
  if (config.error) {
    return (
      <ErrorState
        message={config.error.message}
        onRetry={() => {
          config.reload();
        }}
      />
    );
  }

  if (booking.error && !booking.booking) {
    return (
      <ErrorState
        message={booking.error.message}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const status = booking.booking?.status ?? 'HELD';
  const otpVerified = booking.booking?.otp_verified ?? false;

  return (
    <section className="page page-payment">
      <header className="page-header">
        <h1>Payment</h1>
        <p className="mono">{bookingRef}</p>
      </header>

      <HoldCountdown
        holdExpiresAt={persisted?.hold_expires_at ?? null}
        onExpire={() => {
          // The polling hook will observe EXPIRED and the effect above will
          // navigate. This callback is intentionally a no-op for now.
        }}
      />

      <div className="payment-grid">
        <PaymentStatusView
          booking={{
            booking_ref: bookingRef,
            show_id: persisted?.show_id ?? 0,
            customer_name: '',
            status,
            seat_ids: persisted?.seat_ids ?? [],
            amount_cents: persisted?.amount_cents ?? 0,
            hold_expires_at: persisted?.hold_expires_at ?? '',
            otp_verified: otpVerified,
            payment: booking.booking?.payment ?? null,
            created_at: '',
          }}
        />

        <div className="payment-side">
          {show ? (
            <aside className="card">
              <h3>Order</h3>
              <p>{show.movie_title}</p>
              <p className="hint">
                {show.theatre_name} · {show.screen_name}
              </p>
              <p className="hint">{persisted?.seat_ids.length} seat(s)</p>
            </aside>
          ) : null}

          {otpRequired && status !== 'CONFIRMED' && status !== 'EXPIRED' ? (
            <OtpForm
              onSend={handleSendOtp}
              onVerify={handleVerifyOtp}
              sending={otpSending}
              verifying={otpVerifying}
              sent={otpSent || otpVerified}
              errorMessage={otpError}
            />
          ) : null}

          {otpRequired && !otpVerified && status !== 'EXPIRED' ? (
            <p className="hint">
              OTP verification is required before payment.
            </p>
          ) : null}

          {status === 'HELD' || status === 'PAYMENT_PENDING' ? (
            <button
              type="button"
              className="btn btn-primary btn-pay"
              disabled={
                paying ||
                status === 'PAYMENT_PENDING' ||
                (otpRequired && !otpVerified)
              }
              onClick={handlePay}
            >
              {status === 'PAYMENT_PENDING'
                ? 'Payment pending…'
                : paying
                ? 'Starting payment…'
                : 'Pay now'}
            </button>
          ) : null}

          {paymentMessage ? (
            <p className="hint" role="status">
              {paymentMessage}
            </p>
          ) : null}
          {paymentError ? (
            <p className="form-error" role="alert">
              {paymentError}
            </p>
          ) : null}
        </div>
      </div>

      <p className="hint">
        <Link to={`/shows/${persisted?.show_id ?? 0}/seats`}>Back to seat map</Link>
      </p>
    </section>
  );
}