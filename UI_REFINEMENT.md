# Setwise interaction refinement

The 1.2.0 refinement follows the supplied PRD and the user's subsequent interaction feedback. The interface remains a dark personal training journal. Work prioritizes actual daily workouts, visible optional setup, clear program application and editable planning assumptions alongside the earlier focused logging and phone-local saving.

## Direction

- Background graphite `#090b0f`; surfaces `#12151b` and `#1b2029`; primary text `#f1f4fa`; secondary text `#a1adbf`; restrained steel blue `#a8c3ff` for actionable/selected states. Soft violet and neutral accents are optional local preferences. Legacy cool colors use semantic tokens; the icon/splash follows the default steel-blue identity. Shape and a check mark accompany color for selection/completion.
- Use the iPhone's system sans for familiar, offline typography. Large exercise names identify the active task; tabular numbers support fast set comparison. Form labels use plain words, and inputs use 16 px text.
- Home puts the selected day's actual calendar entries first, including every workout, rest/empty states and status actions. Upcoming dates remain selectable. Train opens Today and keeps the Workout library separate. An active workout overview lists movements, targets and progress; a selected exercise uses the whole viewport with safe-area clearance and a clear route back to all exercises.
- Choices use consistent custom menus with visible keyboard focus, typeahead, large touch targets and selected indicators. Number fields keep the editable text separate from saved numeric values, so users can clear and replace zero.
- Onboarding uses five optional stages with defaults/skipping and visible grouped preferences rather than hidden preference accordions. Bodyweight and cm or feet/inches height are directly available; switching units preserves saved height. Its form body scrolls while Continue, Back/defaults and Skip stay visible. Review exposes preset choice and optional starter calendar creation.
- Program Use opens a dated preview before application, with a choice to keep plans or replace unstarted entries. Optional weekly phases create separate editable target versions; history and explicit rest/skipped/session-linked entries stay protected.
- Weight goals show editable rate or duration, baseline and planning date. Manual deadlines remain fixed; estimates are labeled assumptions, and first reached dates require recorded goal history.
- Nutrition is a visible optional destination with an explicit enable action; calorie information stays out of training. Actual numbers and native progress replace the duplicate calorie ring. Progress's optional milestone list starts collapsed, with no oversized decorative header icon.
- Settings offers saved accent and spacing preferences while keeping dark mode enforced, reduced-motion support and readable controls.

## Skill review

Read the installed `frontend-design` skill from [Anthropic's skill repository](https://github.com/anthropics/skills/tree/main/skills/frontend-design) and `ui-ux-pro-max` from [NextLevelBuilder's repository](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/main/.claude/skills/ui-ux-pro-max), including the latter's general UX rules.

The UI/UX search's generic fitness marketing layout and orange/green palette did not fit the PRD's restrained daily-use product. A subsequent style search returned enterprise, e-ink and layering profiles without a suitable iOS fitness-app match. Applicable general hierarchy, form, touch, safe-area, contrast, focus and reduced-motion guidance informed the implementation; the search results were not treated as an exact iOS fitness-app design match. The refinement uses Setwise's source-defined tokens and task hierarchy, with no marketing sections or decorative workout motion.

Review focuses on actual mobile screenshots, menu interaction inside dialogs, zero replacement, focused-workout recovery and local-save failures. Browser tests establish the exercised behavior; physical iPhone/Safari and VoiceOver remain separate hardware checks.


## Setwise 1.3 controls, identity and explanations

The display brand is Setwise. Its original geometric S mark is shared by the wordmark, favicon, Home Screen icons and native app/splash assets. Storage keys and the native bundle identifier stay stable for compatibility.

Bright accent-filled selected switch tracks with dark thumbs distinguish enabled state from outlined unselected tracks. Native checkbox inputs use custom checkmarks, focus and indeterminate states while keeping keyboard semantics and forced-color fallback. All control hit boxes are at least 44px.

Workout icons summarize actual referenced exercise muscle metadata, with schematic primary/supporting regions and front/back views. They appear on daily, library and plan workout rows; completion remains separate. The diagrams summarize targets rather than measuring recruitment or recovery.

Help is available in the main header, every sheet and focused workout header. Mouse hover and keyboard focus explain controls; Field labels have explicit info buttons. On phones, Help mode makes the next tap explain a control without executing it. Dotted effort terms explain RIR/RPE. Escape dismisses an explanation before closing its containing sheet. Descriptions cover training, progression, goal timelines, nutrition, privacy and optional tools in plain language. Existing hint IDs remain associated with their controls.

Frontend-design and UI/UX Pro Max were applied. The focused `hover tap` UX search supported a tap alternative; the app-specific/critical accessibility reference guided contrast, focus, safe-area and touch checks. Screenshots and the final regression checks are recorded in TEST_REPORT.md.
