# SDE: home-weather-departments

What was built: see spec. Files: server (schema, db migration, config DEPARTMENTS, issues/users/admin routes, smoke), app (index.tsx Home, issues.tsx, admin.tsx, map.tsx, emergency.tsx, profile.tsx, tour.tsx, i18n.tsx, locales.ts, weather.tsx, WeatherAvatar.tsx, WeatherEffects.tsx, LanguagePicker.tsx, StatusChip, IssueCard).

Deviations: none from the spec. RTL layout is not mirrored for Arabic (text aligns right by itself).
Tech debt: older screens (report form, issue detail, leaderboard, login) still show English text; they fall back cleanly.
Bug fixed on the way: SVG gradients shared one id across screens on web, which turned a mascot black; ids are now unique per drawing.
