import { FormEvent, useState } from 'react';

interface OtpFormProps {
  onSend: () => void;
  onVerify: (code: string) => void;
  sending: boolean;
  verifying: boolean;
  sent: boolean;
  errorMessage?: string | null;
}

export function OtpForm({
  onSend,
  onVerify,
  sending,
  verifying,
  sent,
  errorMessage,
}: OtpFormProps) {
  const [code, setCode] = useState('');

  function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim()) return;
    onVerify(code.trim());
  }

  return (
    <section className="card otp-form" aria-label="OTP verification">
      <h3>OTP verification</h3>
      <p className="hint">
        {sent
          ? 'An OTP has been sent. Delivery may be delayed; resending is allowed.'
          : 'Send an OTP to your phone to proceed with payment.'}
      </p>
      <div className="otp-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onSend}
          disabled={sending}
        >
          {sending ? 'Sending…' : sent ? 'Resend OTP' : 'Send OTP'}
        </button>
      </div>
      <form onSubmit={handleVerify}>
        <label className="field">
          <span>OTP code</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={1}
            maxLength={12}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-required="true"
          />
        </label>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={verifying || !code.trim()}
        >
          {verifying ? 'Verifying…' : 'Verify OTP'}
        </button>
      </form>
      {errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}