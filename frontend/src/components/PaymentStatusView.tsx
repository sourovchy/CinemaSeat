import type { Booking } from '../types/api';

interface PaymentStatusProps {
  booking: Booking;
}

export function PaymentStatusView({ booking }: PaymentStatusProps) {
  switch (booking.status) {
    case 'PAYMENT_PENDING':
      return (
        <div className="state state-pending" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <strong>Payment pending</strong>
          <p>
            We have submitted your payment. Waiting for the gateway to confirm.
            This page updates automatically.
          </p>
        </div>
      );
    case 'HELD':
      return (
        <div className="state state-info" role="status">
          <strong>Awaiting payment</strong>
          <p>Hold is active. Start payment below.</p>
        </div>
      );
    case 'CONFIRMED':
      return (
        <div className="state state-success" role="status">
          <strong>Payment successful</strong>
          <p>Your booking is confirmed.</p>
        </div>
      );
    case 'FAILED':
      return (
        <div className="state state-error" role="alert">
          <strong>Payment failed</strong>
          <p>
            The gateway did not confirm this payment. Your seats have been
            released. You can try again from the seat map.
          </p>
        </div>
      );
    case 'EXPIRED':
      return (
        <div className="state state-error" role="alert">
          <strong>Hold expired</strong>
          <p>The hold on your seats expired before payment completed.</p>
        </div>
      );
  }
}