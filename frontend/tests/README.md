# Frontend Test Layout

- `tests/unit`: isolated logic tests (pure functions, hooks/util helpers without external systems).
- `tests/integration`: multi-module behavior tests (API + state + UI interaction flows).

Scripts:

- `npm run test:unit`
- `npm run test:integration`
- `npm test` (runs both)
