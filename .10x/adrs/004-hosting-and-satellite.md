# ADR-004: Free hosting on Render; Google embed for satellite

**Status:** Superseded by ADR-005 (hosting part)
**Date:** 2026-11-11
**Feature:** final-upgrade
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
The app must work with the laptop off, for free, and the satellite view must look like Google Maps.

## Decision
Host server + prebuilt web app as one Render free web service (`render.yaml`), kept awake by a GitHub Actions ping. Satellite on web and keyless Android uses Google's free `output=embed` satellite map; native maps stay on iPhone/Expo Go.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Fly.io / Railway | Persistent volume | Card required or no longer free | Must stay free |
| Building the web app on Render | No committed build | Slow, memory-heavy on free builders | Committed dist is faster and reliable |
| Esri tiles + Leaflet | Our labels and route on top | Not Google's imagery; user found it poor | User asked for Google-like |
| Google Maps JS API | Full control | Needs billing key | Must stay free |

## Consequences
Positive: one-click deploy, no laptop needed, real Google imagery. Negative: free disk is ephemeral (demo data reseeds on restart); embed cannot draw our block labels.
