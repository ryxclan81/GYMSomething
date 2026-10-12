# Setwise visual system

Setwise uses neutral graphite surfaces, restrained accent color and a training-journal hierarchy. The 1.2.0 refinement puts the selected day's workouts ahead of summary graphics. The logo is an original inline geometric mark and wordmark. The product uses system typography and Lucide icons; it contains no copied WHOOP branding, screens or imagery.

## Tokens

Base variables live in `src/styles.css`; `src/refinement.css` supplies the current hierarchy, appearance variants and responsive refinements.

| Token           | Value     | Purpose                                     |
| --------------- | --------- | ------------------------------------------- |
| `--bg`          | `#090B0F` | Graphite page background                    |
| `--surface`     | `#12151B` | Raised content and secondary modules        |
| `--surface-2`   | `#1B2029` | Supporting surfaces/hover states            |
| `--text`        | `#F1F4FA` | Main text                                   |
| `--muted`       | `#A1ADBF` | Secondary labels and descriptions           |
| `--accent`      | `#A8C3FF` | Steel-blue action and selected states       |
| `--accent-ink`  | `#111A2C` | Text on default accent controls             |
| `--selected`    | `#222E43` | Selected surface                            |
| `--line`        | `#29313E` | Quiet dividers                              |
| `--line-strong` | `#596A83` | Input borders and emphasized outlines       |
| `--radius`      | `12px`    | Main radius reference; component radii vary |
| `--space`       | `24px`    | Main spacing reference                      |

Warning/error states use muted amber/coral, with readable text labels and icons where relevant. Accent controls use dark text. Settings → Appearance offers Steel blue (`#A8C3FF`), Soft violet (`#C5B5FF`) or Neutral (`#DDE3EC`) with matching selected surfaces/contrast text. These values flow through semantic tokens, including controls and charts. The app icon/splash uses the default steel-blue identity. CSS enforces `color-scheme: dark`; no light-mode toggle is present.

The font stack is `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`. Tabular numerals keep workout inputs and metrics aligned. Main headings generally scale 30–38 px, with narrower-phone adjustments; body text is 15 px and input text 16 px. Labels use sentence case and restrained tracking. Secondary mobile nutrition text is generally 12–13 px. Home's summary numbers express actual recorded training rather than invented readiness/recovery scores.

## Layout and navigation

On mobile, Home, Train, Plan, Progress and Nutrition sit in fixed bottom navigation. Home's week strip selects a date and lists all its scheduled workouts, with Start, Resume, Review or Skipped states. Empty days and rest days give a clear planning action. Upcoming dates remain directly selectable. Train opens **Today**, with a separate **Workout library** and unscheduled workout action. The weekly summary follows the day's work on mobile and occupies a supporting column on wide screens.

Nutrition remains discoverable while disabled and asks for explicit enablement. Calories stay inside that module. Equipment switching and Settings remain in the header; AI appears only when enabled. Desktop uses a left rail and centered content. Focused workout mode gives the selected exercise the app viewport and hides the normal shell navigation, with a clear **All exercises** return action.

The viewport includes `viewport-fit=cover`. Navigation/sheets incorporate iPhone safe-area padding. Responsive styles cover narrow phones through desktop, avoid fixed-wide tables in core logging, and use wrapping chip/toolbar controls. Screens scroll normally and workout numeric entry uses suitable input modes. A physical iPhone keyboard/background/installed-app pass remains necessary; simulated mobile screenshots do not prove all keyboard behavior.

## Shared controls

- `Button`: selected accent primary, secondary graphite, quiet ghost and explicit destructive variants.
- `IconButton`: labeled icon-only controls with a 44 px box.
- `Field`: connects visible native labels and hints to inputs and custom controls with matching IDs.
- `Select`: styled Radix menus with keyboard navigation/typeahead, selected indicators, disabled options, scroll controls and dialog-aware portals.
- `NumericInput`: keeps editable text separate from the displayed numeric value; focus selects the current value and clearing/replacing zero remains possible. Blur reconciles with the saved value.
- `HeightInput`: optional cm or separately labeled Feet/Inches fields following the profile units; switching display preserves the canonical cm measurement.
- `Sheet`: native modal `<dialog>` with a close button, Escape support, backdrop and constrained scrolling; browser dialog behavior provides modal focus handling.
- `Empty`: plain, descriptive empty-state text and an optional action.
- `Toasts`: short feedback in a polite live region.

Form inputs and main buttons generally have a minimum height of 46 px. Some secondary filter chips are smaller; passing an accessibility check does not imply every control exceeds the same touch-size target. Visible keyboard focus uses a 2 px accent outline with spacing. Native inputs and Radix choices retain keyboard/screen-reader semantics; physical Safari/VoiceOver behavior needs separate validation.

Onboarding presents five stages—basics, rhythm, equipment, optional tools and review—with **Use defaults** / **Skip for now** actions. Optional measurements, experience/goals, training preferences, limitations and inventory details are visible in labeled groups. The form body scrolls, resets its scroll position between steps, and retains a visible Continue/Back/defaults footer. Review exposes the workout preset and optional starter calendar choice. Saved profile/equipment choices remain editable in Settings.

Program application has a date preview, first-workout alignment option and a clear choice to keep existing plans or replace only unstarted entries. Optional phase controls group week ranges with rep/set/load targets. This makes the calendar effect reviewable before saving.

## Workout behavior

Today's overview lists each movement's primary/secondary muscles, planned sets/ranges/rest and completion state. Tapping a movement opens focused logging with a large exercise name, target summary, technique access and aligned set rows. The next unfinished set receives a visible emphasis. Exercise focus is saved with the session and can resume after reload.

Stored load conventions are labeled beside targets (per dumbbell, total, added load, machine stack or assistance). Cardio shows editable minutes/km while persisted duration remains seconds; isometric holds use seconds. Completion uses check states with accessible pressed labels. Warm-up/skipped states remain visible rather than disappearing from history. Prior performance stays secondary to current inputs.

The rest timer uses a large readable countdown plus start/pause/reset and ±30 second actions. A timestamp drives elapsed time. Haptic feedback is attempted only where supported; the PWA does not claim guaranteed iPhone vibration or background alert delivery. Group names support superset/circuit organization without hiding the underlying exercises/sets.

## Data presentation

Trend charts use thin SVG lines, minimal gridlines and inspectable points. The selected point shows its value/date. Keyboard-accessible points and a data-table disclosure provide additional access to plotted values. Muscle analytics distinguish direct sets, heuristic indirect contributions and training-day frequency. Empty charts invite actual logging and never draw fabricated training points.

Goal bars show numeric values and percentages; decreasing goals use the same directional calculation. Supported weight goals show editable baseline/rate/weeks/date assumptions, an explicitly labeled estimated date and a separate fixed manual deadline when chosen. The first reached date is shown only when recorded goal history crosses the target. Records are named according to measurement semantics rather than displayed as an undifferentiated strength score. Optional motivational tiers explain their informal assumptions and can be customized per lift; the gamification milestone list starts collapsed.

Nutrition shows actual logged calorie/macro values and native progress bars against editable targets. It avoids a duplicate decorative calorie ring. Summary graphics stay subordinate to the diary and recorded values.

## Motion and accessibility

Transitions are brief and restrained, mainly for controls, sheets and feedback. Styles honor `prefers-reduced-motion`. Text/icons, numeric labels and completion states accompany color. Error messages use alert/live-region semantics where appropriate. Native forms remain keyboard operable.

Saving/errors are visible. Storage failure offers a recovery export while retaining unsaved edits. Full backup and destructive actions remain explicit in Settings.

Settings → Appearance persists accent and Comfortable/Compact spacing in the local profile and full JSON backup. Compact spacing reduces selected list/card padding while retaining readable controls. There is no separate font-scale preference; normal browser/device accessibility settings still apply.

The feedback-driven refinement and applied design-skill references are in [UI_REFINEMENT.md](UI_REFINEMENT.md). Visual QA, viewport coverage, accessibility results and retained screenshots are recorded in [TEST_REPORT.md](TEST_REPORT.md).
