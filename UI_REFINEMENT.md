# Setwise interaction refinement

The 1.5.0 refinement follows the supplied PRD and the user's subsequent interaction feedback. The interface remains a dark personal training journal, now using an evergreen and sage identity. Work prioritizes a clear welcome entry, actual daily workouts, focused logging, visible optional setup and reviewable workout management alongside phone-local saving.

## Direction

- Background evergreen `#0c1310`; surfaces `#15231c` and `#1e3027`; primary text `#f0f4ee`; secondary text `#a9bcb0`; quiet sage `#c0dfc5` for actionable/selected states, with dark accent text `#13241b`. Sky blue, soft violet and neutral remain optional local preferences. Shape and a check mark accompany color for selection/completion.
- Use the iPhone's system sans for familiar, offline typography. Large exercise names identify the active task; tabular numbers support fast set comparison. Form labels use plain words, and inputs use 16 px text.
- Home puts the selected day's actual calendar entries first, including every workout, rest/empty states and status actions. Upcoming dates remain selectable. Workouts is a dedicated reusable library; Home remains daily selection. Home and Plan accept horizontal week swipes with button alternatives. An active workout overview lists movements, targets and progress; a selected exercise uses the whole viewport with safe-area clearance and a clear route back to all exercises.
- Choices use consistent custom menus with visible keyboard focus, typeahead, large touch targets and selected indicators. Number fields keep the editable text separate from saved numeric values, so users can clear and replace zero.
- New users enter through a dedicated Welcome page with **Get started**, a clearly labeled example set log and a concise explanation that setup is optional and records stay on the device. Returning users keep direct access to their records.
- The phone header contains the Home logo, a compact equipment icon and Settings. Desktop selection uses only its highlight; mobile selection uses a stronger icon and bold underlined label. Help icons provide local explanations without a global mode. The bottom navigation occupies a real layout row, while the page scrolls in the remaining height, so the final controls do not sit behind it.
- Onboarding uses five optional stages with defaults/skipping and visible grouped preferences rather than hidden preference accordions. Bodyweight and cm or feet/inches height are directly available; switching units preserves saved height. Its form body scrolls while Continue, Back/defaults and Skip stay visible. Review starts empty by default and explicitly offers a small matched preset set with optional starter calendar creation.
- Program Use opens a dated preview before application, with a choice to keep plans or replace unstarted entries. Optional weekly phases create separate editable target versions; history and explicit rest/skipped/session-linked entries stay protected.
- A compact workout icon control opens a 22-glyph library. All 15 starter workouts have distinct appropriate icons; saved choices survive reload, and primary/supporting muscle labels still come from the actual exercises. Native buttons expose selected state, support keyboard selection and retain at least 44px touch targets.
- Workouts default to **Recently saved**, with explicit name, training-focus or duration ordering available. Permanent deletion opens an exact-impact review: unstarted calendar entries and program links are removed, while saved sessions and the active workout remain playable. Calendar records linked to snapshots retain their names. Unrecoverable completed calendar records block deletion with a clear explanation.
- Program cards use 24px interior padding and 18px separation, with 18px padding on the narrowest phones. Date/phase metadata, workout names and actions have their own breathing room.
- Weight goals show editable rate or duration, baseline and planning date. Manual deadlines remain fixed; estimates are labeled assumptions, and first reached dates require recorded goal history.
- Nutrition is a visible optional destination with an explicit enable action; calorie information stays out of training. Actual numbers and native progress replace the duplicate calorie ring. Progress's optional milestone list starts collapsed, with no oversized decorative header icon.
- Settings offers saved accent and spacing preferences while keeping dark mode enforced, reduced-motion support and readable controls.

## Skill review

Read the installed `frontend-design` skill from [Anthropic's skill repository](https://github.com/anthropics/skills/tree/main/skills/frontend-design) and `ui-ux-pro-max` from [NextLevelBuilder's repository](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/main/.claude/skills/ui-ux-pro-max), including the latter's general UX rules.

The UI/UX search's generic fitness marketing layout and orange/green palette did not fit the PRD's restrained daily-use product. A subsequent style search returned enterprise, e-ink and layering profiles without a suitable iOS fitness-app match. Applicable general hierarchy, form, touch, safe-area, contrast, focus and reduced-motion guidance informed the implementation; the search results were not treated as an exact iOS fitness-app design match. The refinement uses Setwise's source-defined tokens and task hierarchy, with no marketing sections or decorative workout motion.

For 1.4, the installed Minimal Design guidance supplies a restrained spacing rhythm and clear control states without importing its unrelated light palette. The fresh [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) inform keyboard focus, native semantics, confirmation flows, reduced motion and safe-area review. The focused UI/UX search for icon-choice keyboard access supports labeled native buttons with a visible selected state.

Review focuses on actual mobile screenshots, menu interaction inside dialogs, zero replacement, focused-workout recovery and local-save failures. Browser tests establish the exercised behavior; physical iPhone/Safari and VoiceOver remain separate hardware checks.

## Setwise controls, identity and explanations

The display brand is Setwise. Its original geometric S mark is shared by the wordmark, favicon, Home Screen icons and native app/splash assets. Storage keys and the native bundle identifier stay stable for compatibility.

Bright accent-filled selected switch tracks with dark thumbs distinguish enabled state from outlined unselected tracks. Native checkbox inputs use custom checkmarks, focus and indeterminate states while keeping keyboard semantics and forced-color fallback. All control hit boxes are at least 44px.

Workout icons use a consistent stroke style across Lucide and small original SVG glyphs. They identify a saved workout at a glance and are user-selectable. Actual referenced exercises continue to provide muscle descriptions; an icon choice does not change training targets or imply measured recruitment/recovery. Completion remains a separate visible state.

Help is available locally in Settings, sheets, fields and workout logging. Mouse hover waits 700 ms; keyboard focus explains normal controls. Help-icon buttons never trigger automatic hover tooltips, and tapping one explains only its nearby field or view. Dropdown tooltips describe the specific option; dynamic self-describing options stay quiet. Ordinary actions remain usable while help is open. Dotted effort terms explain RIR/RPE. Escape dismisses an explanation before closing its containing sheet. Descriptions cover training, progression, goal timelines, nutrition, privacy and optional tools in plain language. Existing hint IDs remain associated with their controls, and portaled help belongs to a named landmark.

Frontend-design and UI/UX Pro Max were applied. The focused `hover tap` UX search supported a tap alternative; the app-specific/critical accessibility reference guided contrast, focus, safe-area and touch checks. Screenshots and the final regression checks are recorded in TEST_REPORT.md.
