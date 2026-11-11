# Strategy and stack - Campus Fix

Date: 2026-11-11

- **Build, not buy.** The task is to build it; no existing tool fits the rubric.
- **Stack:** Expo SDK 58 (React Native, TypeScript) + Node/Express 5 + SQLite. All free, all local, no accounts.
- **Why a server:** the rubric needs two emulators to share reports. Local-only storage cannot do that.
- **Risk accepted:** Expo Go must be installed on each emulator once, which needs internet on setup day.
- **Open question for Arjun:** whether the rules allow bringing a pre-built app. If not, this build is the rehearsal and the code is rebuilt on the day from `claude-code-prompts.md`.
