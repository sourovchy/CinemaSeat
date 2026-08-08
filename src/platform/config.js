function int(value, fallback) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// HOLD_TTL_SECONDS is read from the environment only — never hardcoded.
export const config = {
  port: int(process.env.PORT, 3000),
  holdTtlSeconds: int(process.env.HOLD_TTL_SECONDS, 120),
  paymentPendingTimeoutSeconds: int(process.env.PAYMENT_PENDING_TIMEOUT_SECONDS, 600),
  sweepIntervalSeconds: int(process.env.SWEEP_INTERVAL_SECONDS, 5),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://cinemaseat:cinemaseat@localhost:5432/cinemaseat',
  gatewayUrl: process.env.GATEWAY_URL ?? 'http://localhost:9000',
  publicCallbackUrl:
    process.env.PUBLIC_CALLBACK_URL ?? 'http://app:3000/api/payments/callback',
};
