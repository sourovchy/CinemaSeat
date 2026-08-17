# CinemaSeat Current Runtime Verification

This document records the runtime and automated test verification outcomes of the CinemaSeat codebase against the active Dockerized stack and local runtimes.

---

## 1. Verification Date
* **Verification Run Date**: August 17, 2026
* **Environment**: Windows Host with active Docker Desktop (Docker Compose stack)

---

## 2. Frontend Verification

The following validation steps were executed inside the `frontend/` directory:

### Unit & Component Integration Tests
* **Command**: `npm test`
* **Result**: **PASS**
* **Output Summary**:
  * **Test Files**: 8 passed (8 total)
  * **Tests**: 23 passed (23 total)
  * **Failed**: 0
  * **Duration**: 9.20 seconds
  * **Test Breakdown**:
    * `src/test/ShowtimeDateSelector.test.tsx` (4 tests) - PASS
    * `src/test/Selection.test.tsx` (3 tests) - PASS
    * `src/test/SeatLegend.test.tsx` (1 test) - PASS
    * `src/test/PaymentStatusView.test.tsx` (5 tests) - PASS
    * `src/test/BookingConfirmation.test.tsx` (2 tests) - PASS
    * `src/test/SeatMap.test.tsx` (3 tests) - PASS
    * `src/test/NavbarSearch.test.tsx` (1 test) - PASS
    * `src/test/MovieNavigation.test.tsx` (4 tests) - PASS

### Static Type Check
* **Command**: `npm run typecheck`
* **Result**: **PASS**
* **Output**: TypeScript compiler finished cleanly with exit code 0.

### Production Build
* **Command**: `npm run build`
* **Result**: **PASS**
* **Output Summary**:
  * Vite successfully compiled the frontend React assets for production.
  * 61 modules transformed.
  * Build Artifacts:
    * `dist/index.html` (1.76 kB)
    * `dist/assets/index-DxKHx5uk.css` (50.65 kB)
    * `dist/assets/index-C6bl8MjJ.js` (289.20 kB)

---

## 3. Backend Verification
* **Command**: `npm test` (executed from the repository root against active PostgreSQL instance)
* **Result**: **PASS**
* **Output Summary**:
  * **Total Tests**: 22 passed, 0 failed, 0 skipped.
  * **Suites Executed**:
    * `test/api.test.js`: Health checks, catalog endpoints, seat map queries, transactional multi-seat holds, OTP fallback, webhook acknowledgements, and schedule audits.
    * `test/scenario-a.test.js`: Concurrency drill with 100 simultaneous holds.
    * `test/scenario-b.test.js`: Expiration recovery and abandoned seat reclamation.
    * `test/timezone.test.js`: Bangladesh Standard Time (BST) date mapping.

---

## 4. Timezone / Scheduling Verification
* **Command**: `node --test test/timezone.test.js`
* **Result**: **PASS**
* **Output Summary**:
  * ✔ Timezone Case 1: Before Bangladesh midnight (1.96ms)
  * ✔ Timezone Case 2: After Bangladesh midnight (1.13ms)
  * ✔ Timezone Case 3: Rolling-window boundaries (0.29ms)
  * ✔ Timezone Case 4: Host timezone independence (0.15ms)
  * ✔ Timezone Case 5: Template date extraction using BST semantics (0.13ms)
  * **Total**: 5 tests passed, 0 failed.

---

## 5. Dockerized Stack & E2E Integration Verification

### Compose Stack Health Status
* **Containers**:
  * `cinemaseat-app-1` (Fastify API): `healthy` (Port 3000)
  * `cinemaseat-db-1` (PostgreSQL 16): `healthy` (Port 5500/5432)
  * `cinemaseat-web-1` (Nginx Web / SPA): `healthy` (Port 8080)
  * `gateway` (Mock Payment / OTP Gateway): `healthy` (Port 9000)

### Payment Foundation Smoke Drill
* **Command**: `node scripts/payment-smoke.mjs`
* **Result**: **PASS**
* **Scenarios Verified**:
  * Deterministic Happy Path (Immediate 202, async confirmation callback, seat booked): **PASS**
  * Forced Failure (`X-Mock-Force: fail`, booking failed, seat released to AVAILABLE): **PASS**
  * Duplicate Webhook Handling (Idempotent confirmation, single seat booking): **PASS**
  * Webhook Race Conditions (Callback arriving before charge response): **PASS**
  * Charge Timeout & Retry (503 on timeout, client-side unblock in ~3s, successful retry): **PASS**

### Concurrency Burst Drill (Scenario A)
* **Command**: `node scripts/scenario-a.mjs`
* **Result**: **PASS**
* **Metrics**:
  * Requests sent: 100
  * Successful holds: 1
  * Rejections (409 Conflict): 99
  * Oversell count: 0
  * Burst execution time: 382 ms

---

## 6. Summary Table

| Area | Result | Notes |
| :--- | :--- | :--- |
| **Frontend tests** | **PASS** | 23 assertions passed across 8 test suites. |
| **Typecheck** | **PASS** | TypeScript compilation completed with 0 errors. |
| **Production build** | **PASS** | Vite production bundle packaged successfully. |
| **Backend tests** | **PASS** | 22/22 tests passed (integration, concurrency, timezone). |
| **Timezone tests** | **PASS** | 5 unit tests validating BST scheduling semantics passed. |
| **Integration / Runtime** | **PASS** | All Compose containers healthy; payment smoke & concurrency drills passed. |
