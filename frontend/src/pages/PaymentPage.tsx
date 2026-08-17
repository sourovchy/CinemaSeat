import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { configApi, paymentsApi } from '../api/bookings';
import { showsApi } from '../api/catalog';
import { ApiError } from '../api/client';
import { useBookingPolling } from '../hooks/useBookingPolling';
import { useAsync } from '../hooks/useAsync';
import { LoadingState, ErrorState } from '../components/States';
import { HoldCountdown } from '../components/HoldCountdown';
import { PaymentStatusView } from '../components/PaymentStatusView';
import { formatCents, formatDateTime } from '../lib/format';
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

const WalletIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 10h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8z" />
    <circle cx="16" cy="15" r="1" />
  </svg>
);

const CardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}>
    <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

export function PaymentPage() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const bookingRef = ref ?? '';

  const persisted = useMemo(
    () => (bookingRef ? loadPersistedHold(bookingRef) : null),
    [bookingRef],
  );

  const config = useAsync(() => configApi.get(), []);

  const booking = useBookingPolling(
    bookingRef,
    Boolean(bookingRef) && config.data?.otp_required !== undefined,
    { intervalMs: 1500, maxAttempts: 80 },
  );

  const showId = persisted?.show_id ?? booking.booking?.show_id ?? 0;

  const showState = useAsync(
    async () => {
      const shows = (await showsApi.list()).shows;
      return shows;
    },
    [showId],
  );

  const show: Show | null = useMemo(() => {
    if (!showState.data || !showId) return null;
    return showState.data.find((s) => s.id === showId) ?? null;
  }, [showState.data, showId]);

  const seatIds = persisted?.seat_ids ?? booking.booking?.seat_ids ?? [];

  const decodedSeatsString = useMemo(() => {
    if (!seatIds.length) return '';
    return seatIds
      .map((sid) => {
        const rowIdx = Math.floor(sid / 100) - 1;
        const seatNum = sid % 100;
        const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q'];
        const rowLabel = rows[rowIdx] || `R${rowIdx + 1}`;
        return `${rowLabel}${seatNum}`;
      })
      .sort()
      .join(', ');
  }, [seatIds]);

  const subtotalCents = persisted?.amount_cents ?? booking.booking?.amount_cents ?? 0;
  const convenienceFeeCents = seatIds.length > 0 ? 4000 : 0;
  const totalCents = subtotalCents + convenienceFeeCents;

  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Card'>('bKash');
  const [otpCodeInput, setOtpCodeInput] = useState('');
 
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
    return (
      <div className="page-container">
        <ErrorState title="Missing booking reference" message="No booking was specified." />
      </div>
    );
  }

  if (config.loading || (!persisted && !booking.booking && !booking.error)) {
    return (
      <div className="page-container">
        <LoadingState label="Loading booking details…" />
      </div>
    );
  }
  if (config.error) {
    return (
      <div className="page-container">
        <ErrorState
          message={config.error.message}
          onRetry={() => {
            config.reload();
          }}
        />
      </div>
    );
  }

  if (booking.error && !booking.booking) {
    return (
      <div className="page-container">
        <ErrorState
          message={booking.error.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const status = booking.booking?.status ?? 'HELD';
  const otpVerified = booking.booking?.otp_verified ?? false;

  return (
    <div className="page-container" style={{ maxWidth: '1200px', marginInline: 'auto', paddingInline: '24px' }}>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>Payment Details</h1>
        <p className="mono" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: '4px' }}>
          Reference: {bookingRef}
        </p>
      </div>

      <div className="payment-grid">
        {/* Left Column: Payment & OTP */}
        <div className="payment-main-section">
          {status === 'PAYMENT_PENDING' ? (
            <PaymentStatusView
              booking={{
                booking_ref: bookingRef,
                show_id: showId,
                customer_name: '',
                status,
                seat_ids: seatIds,
                amount_cents: subtotalCents,
                hold_expires_at: persisted?.hold_expires_at ?? booking.booking?.hold_expires_at ?? '',
                otp_verified: otpVerified,
                payment: booking.booking?.payment ?? null,
                created_at: '',
              }}
            />
          ) : (
            <div className="card payment-form-card" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-3)' }}>
                Payment
              </h2>

              {/* Mobile Verification (OTP) Section */}
              <div className="payment-section" style={{ marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
                  Mobile Verification
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                  Send a verification code to your mobile number.
                </p>

                {!otpVerified && (
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleSendOtp}
                      disabled={otpSending}
                      style={{ height: '42px', padding: '0 20px', width: '100%', maxWidth: '200px' }}
                    >
                      {otpSending ? 'Sending…' : 'Send OTP'}
                    </button>
                  </div>
                )}

                {otpRequired && (otpSent || otpVerified) && !otpVerified && (
                  <div style={{ marginBottom: 'var(--space-4)', maxWidth: '320px' }}>
                    <label className="field" style={{ marginBottom: 'var(--space-3)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                        OTP Code
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="______"
                        maxLength={6}
                        disabled={otpVerifying}
                        value={otpCodeInput}
                        onChange={(e) => setOtpCodeInput(e.target.value)}
                        style={{
                          height: '42px',
                          textAlign: 'center',
                          letterSpacing: '6px',
                          fontWeight: 'bold',
                          fontSize: 'var(--text-lg)',
                          width: '100%',
                          background: 'var(--color-bg-input)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text)',
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleVerifyOtp(otpCodeInput)}
                      disabled={otpVerifying || otpCodeInput.length < 6}
                      style={{ width: '100%', height: '42px' }}
                    >
                      {otpVerifying ? 'Verifying…' : 'Verify OTP'}
                    </button>
                  </div>
                )}

                {otpVerified && (
                  <div style={{ color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                    <span>✓ Mobile verified</span>
                  </div>
                )}

                {otpError && (
                  <p className="form-error" role="alert" style={{ color: 'var(--color-red)', fontSize: 'var(--text-sm)', marginTop: '8px' }}>
                    {otpError}
                  </p>
                )}
              </div>

              {/* Payment Method Selector Section */}
              <div className="payment-section" style={{ marginBottom: 'var(--space-6)', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-6)' }}>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
                  Payment Method
                </h3>
                <div className="payment-methods-grid">
                  {(['bKash', 'Nagad', 'Rocket', 'Card'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      disabled={otpRequired && !otpVerified}
                      className={`payment-method-btn ${selectedMethod === method ? 'active' : ''}`}
                      onClick={() => setSelectedMethod(method)}
                    >
                      {method === 'Card' ? <CardIcon /> : <WalletIcon />}
                      <span>{method}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pay Button Section */}
              <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-6)' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-pay"
                  disabled={
                    paying ||
                    (otpRequired && !otpVerified) ||
                    !selectedMethod
                  }
                  onClick={handlePay}
                  style={{ width: '100%', padding: '14px', fontSize: 'var(--text-md)', fontWeight: 700 }}
                >
                  {paying ? 'Processing Payment…' : `Pay ${formatCents(totalCents)}`}
                </button>

                {paymentError && (
                  <div className="form-error" role="alert" style={{ color: 'var(--color-red)', fontSize: 'var(--text-sm)', marginTop: '8px', textAlign: 'center' }}>
                    {paymentError}
                  </div>
                )}
                {paymentMessage && (
                  <div className="hint" role="status" style={{ fontSize: 'var(--text-sm)', marginTop: '8px', textAlign: 'center', color: 'var(--color-green)' }}>
                    {paymentMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary & Hold Countdown */}
        <div className="payment-side" style={{ position: 'sticky', top: '24px' }}>
          <HoldCountdown
            holdExpiresAt={persisted?.hold_expires_at ?? booking.booking?.hold_expires_at ?? null}
            onExpire={() => {}}
          />

          {show && (
            <aside className="card booking-summary" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
                Order Summary
              </h3>
              <dl className="summary-meta" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div>
                  <dt>Movie</dt>
                  <dd style={{ fontWeight: 700, color: 'var(--color-text)' }}>{show.movie_title}</dd>
                </div>
                <div>
                  <dt>Theatre</dt>
                  <dd style={{ color: 'var(--color-text-secondary)' }}>{show.theatre_name}</dd>
                </div>
                <div>
                  <dt>Hall</dt>
                  <dd>{show.screen_name}</dd>
                </div>
                <div>
                  <dt>Date & Time</dt>
                  <dd>{formatDateTime(show.starts_at)}</dd>
                </div>
                <div>
                  <dt>Seats</dt>
                  <dd style={{ color: 'var(--color-text)', fontWeight: 700 }}>
                    {decodedSeatsString || '—'}
                  </dd>
                </div>
                <div>
                  <dt>Ticket Quantity</dt>
                  <dd>{seatIds.length} Ticket{seatIds.length === 1 ? '' : 's'}</dd>
                </div>
                <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-2)' }}>
                  <dt>Subtotal</dt>
                  <dd>{formatCents(subtotalCents)}</dd>
                </div>
                <div>
                  <dt>Convenience Fee</dt>
                  <dd>{formatCents(convenienceFeeCents)}</dd>
                </div>
                <div style={{ borderTop: '2px dashed var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'var(--space-1)' }}>
                  <dt style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 'var(--text-base)' }}>Total</dt>
                  <dd style={{ color: 'var(--color-accent)', fontWeight: 800, fontSize: 'var(--text-lg)' }}>
                    {formatCents(totalCents)}
                  </dd>
                </div>
              </dl>
            </aside>
          )}

          <p className="hint" style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
            <Link to={`/shows/${showId}/seats`}>Back to seat map</Link>
          </p>
        </div>
      </div>
    </div>
  );
}