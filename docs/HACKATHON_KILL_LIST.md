# Kill List

Things we deliberately do NOT build. Cuts are pre-agreed so they cost zero
debate time. Nothing here may displace a mandatory requirement.

- Admin portal / cinema management UI
- Recommendation engine, search, social features
- Frontend polish or animation (frontend itself is optional)
- Kafka / message brokers
- Redis — Postgres is the lock and the source of truth; a second store is
  how double-bookings are born
- Kubernetes
- Microservice decomposition
- Login / JWT / user accounts (rate limiting + validation only)
- Caching layers
- Distributed tracing before core tests pass
- AWS while the Poridhi VM path works
- Scenario C until every mandatory item is stable
- Multi-currency, pricing engines, seat classes beyond flat per-show price
