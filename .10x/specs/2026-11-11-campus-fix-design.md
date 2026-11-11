# Campus Fix - design spec

Date: 2026-11-11. Source: `Software Development Task.pdf` and the signed-off plan `input/ideas/campus-issue-reporter-plan.md`.

## What it is
A student app for reporting campus problems, seeing other students' reports, and upvoting them. One admin account moves reports through Reported > Acknowledged > In Progress > Resolved.

## Design direction
- **Idea:** a maintenance tag. Each report is a tag with a tear-off stub that holds the upvote count. The stub turns yellow when you have voted.
- **Colour:** cool grey paper, ink text, one yellow (#FFC53D) for the main action and "you voted". Status colours: grey, blue, orange, green, each with its own icon.
- **Type:** Barlow Semi Condensed for headings and numbers, Barlow for text. Sentence case throughout.
- **Layout:** left aligned, 16 px gutters, content capped at 760 px so tablets and laptops stay readable; the feed goes to two columns from 700 px.
- **Motion:** only where it answers an action: the reward banner, confetti for a badge or level-up, the level bar filling.

## Screens
Login, Register, Issues (feed), Report, Leaderboard, Profile, Manage (admin), Report detail.

## Rules
See plan sections 3 to 5 for the schema, API and points rules. They were implemented as written, with the changes listed in the plan's change log.
