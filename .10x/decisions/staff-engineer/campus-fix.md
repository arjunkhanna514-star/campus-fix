# Patterns and standards - Campus Fix

Date: 2026-11-11

- One error shape everywhere: `{ error: "message" }` with the right status code (`middleware/errors.js`).
- Every body validated with zod before use (`validation.js`). Every multi-row write inside `transaction()`.
- SQL always uses `?` placeholders. Sort order comes from a fixed list.
- App: no hex colours or font names outside `src/theme.ts`. UI primitives live in `src/components/ui.tsx`.
- Every file starts with a plain-language comment saying what it is for, so it can be explained to a judge.
- Accessibility floor: 48 dp targets, labels on icon-only buttons, status shown by icon and text as well as colour.
