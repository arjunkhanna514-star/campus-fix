# Home, weather, departments, languages and tour - design

Date: 2026-11-11. Decided by the team on Arjun's standing instruction (hands-off, everything free).

## Scope
1. **Departments.** Every category belongs to one department (who fixes it). Students never choose a department; it follows from the category, so students still cannot assign responsibility. Feed and admin filter by department and by building.
   - IT Services: Computers & IT, Network & Wi-Fi, Projector & AV
   - Estates & Maintenance: Furniture, Water & Plumbing, Electrical
   - Cleaning Services: Cleanliness
   - Health & Safety: Safety
   - Student Services: Other
2. **Home tab first** for students and admins: weather avatar, quick actions (report or manage, map, SOS, tour, language), campus progress, latest reports.
3. **Live weather** from Open-Meteo (free, no key) for MCAST Paola, refreshed every 10 minutes. Codes map to sun, partly cloudy, cloudy, fog, drizzle, rain, storm, snow; wind above 30 km/h adds wind; is_day=0 means night. Season from the date (Malta). A "preview" switch lets the demo show every weather.
4. **Weather avatar**: the Tag mascot with a pose per weather (umbrella, sunglasses, scarf, beanie, holding on in wind, sleepy under the moon), with matching particles.
5. **Map weather layer**: the same particles over the map and the satellite view, never blocking touches.
6. **Languages**: English, Malti, Italiano, Español, Français, Deutsch, Português, हिन्दी, 中文, العربية. Covers navigation, Home, Map, Emergency, filters, statuses and the tour; report text stays as written. English is the fallback for any missing string.
7. **Tour**: animated steps with "Try it" buttons, narrated by expo-speech preferring a male voice (lower pitch as fallback). Student and admin versions.

## Out of scope
Machine translation of user reports, RTL mirroring of the layout, server-side weather.
