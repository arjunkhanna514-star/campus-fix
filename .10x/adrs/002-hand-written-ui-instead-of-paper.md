# ADR-002: Hand-written UI components instead of React Native Paper

**Status:** Accepted
**Date:** 2026-11-11
**Feature:** campus-fix
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
The plan named React Native Paper. The brief gives 15 marks for design, and Arjun asked that the app not look generated or templated.

## Decision
Write the small set of primitives the app needs (text, button, chip, segmented control, input, card) in `app/src/components/ui.tsx`, driven by tokens in `app/src/theme.ts`. Use the Barlow type family and a yellow "maintenance tag" as the one strong visual idea.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| React Native Paper | Many ready components, Material look | Stock Material 3 look reads as a template; another dependency to match with Expo SDK 58 | Works against the design marks |
| NativeWind or a Tailwind-style kit | Fast styling | A build step and a new syntax to explain to judges | Harder to explain |

## Consequences

### Positive
- A look that belongs to this app, and fewer dependencies.
- Every component is short enough to explain in the interview.

### Negative
- No ready-made date pickers, menus or dialogs. The app does not need them.

### Risks
- Accessibility has to be done by hand. Mitigation: roles, labels and 48 dp targets are set in the primitives.

## Dependencies
- `@expo/vector-icons`, `@expo-google-fonts/barlow`, `@expo-google-fonts/barlow-semi-condensed`.
