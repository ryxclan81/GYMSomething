# Setwise visual system

Setwise uses dark evergreen surfaces, a quiet sage accent and a training-journal hierarchy. The 1.4.0 refinement adds a dedicated welcome entry, slimmer phone chrome and clearer workout management while keeping the selected day's workouts ahead of summary graphics. The logo is an original inline geometric mark and wordmark. The product uses system typography, Lucide icons and consistent workout glyphs; it contains no copied WHOOP branding, screens or imagery.

## Tokens

Base variables live in `src/styles.css`; `src/evergreen.css` supplies the current palette and mobile layout. `src/refinement.css` retains supporting hierarchy rules, and `src/planning-ui.css` scopes the icon picker and program spacing.

| Token           | Value     | Purpose                                     |
| --------------- | --------- | ------------------------------------------- |
| `--bg`          | `#0C1310` | Evergreen page background                   |
| `--surface`     | `#15231C` | Raised content and secondary modules        |
| `--surface-2`   | `#1E3027` | Supporting surfaces/hover states            |
| `--text`        | `#F0F4EE` | Main text                                   |
| `--muted`       | `#A9BCB0` | Secondary labels and descriptions           |
| `--accent`      | `#C0DFC5` | Sage action and selected states             |
| `--accent-ink`  | `#13241B` | Text on default accent controls             |
| `--selected`    | `#2B4133` | Selected surface                            |
| `--line`        | `#304739` | Quiet dividers                              |
| `--line-strong` | `#769680` | Input borders and emphasized outlines       |
| `--radius`      | `14px`    | Main radius reference; component radii vary |
| `--space`       | `24px`    | Main spacing reference                      |

Warning/error states use muted amber/coral, with readable text labels and icons where relevant. Accent controls use dark text. Settings → Appearance offers Sage (`#C0DFC5`), Sky blue (`#B8D4E2`), Soft violet (`#D1CBE2`) or Neutral (`#E2E5DC`) with matching selected surfaces/contrast text. Existing saved accent keys stay compatible, while an unset preference uses sage. These values flow through semantic tokens, including controls and charts. The app identity uses the evergreen/sage direction. CSS enforces `color-scheme: dark`; no light-mode toggle is present.

The font stack is `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`. Tabular numerals keep workout inputs and metrics aligned. Main app headings generally scale 30–38 px, with narrower-phone adjustments and a larger welcome headline; body and input text are 16 px. Labels use sentence case and restrained tracking. Secondary mobile nutrition text is generally 12–13 px. Home's summary numbers express actual recorded training rather than invented readiness/recovery scores.

## Layout and navigation

On mobile, Home, Train, Plan, Progress and Nutrition occupy a real bottom-navigation layout row. The shell uses the dynamic viewport height; `.app-content` scrolls in the remaining space with `min-height: 0`, so content cannot sit beneath the navigation. The header is limited to the logo and Settings. Equipment selection is available in context on Home/Train, and Help mode remains available in Settings, sheets and focused logging.

New users first see Welcome with **Get started**, a labeled example set log and a concise explanation of optional setup and local records. The CTA opens the existing optional setup stages. Returning completed profiles open their saved app directly.

Home's week strip selects a date and lists all its scheduled workouts, with Start, Resume, Review or Skipped states. Empty days and rest days give a clear planning action. Upcoming dates remain directly selectable. Train opens **Today**, with a separate **Workout library** and unscheduled workout action. The weekly summary follows the day's work on mobile and occupies a supporting column on wide screens.

Nutrition remains discoverable while disabled and asks for explicit enablement. Calories stay inside that module. Desktop equipment switching remains in the header; Settings stays available on every normal app screen. AI appears only when enabled. Desktop uses a left rail and centered content. Focused workout mode gives the selected exercise the app viewport and hides the normal shell navigation, with a clear **All exercises** return action.

The viewport includes `viewport-fit=cover`. Navigation/sheets incorporate iPhone safe-area padding. Responsive styles cover narrow phones through desktop, avoid fixed-wide tables in core logging, and use wrapping chip/toolbar controls. Screens scroll normally and workout numeric entry uses suitable input modes. A physical iPhone keyboard/background/installed-app pass remains necessary; simulated mobile screenshots do not prove all keyboard behavior.

## Shared controls

- `Button`: sage accent primary, secondary evergreen, quiet ghost and explicit destructive variants.
- `IconButton`: labeled icon-only controls with a 44 px box.
- `Field`: connects visible native labels and hints to inputs and custom controls with matching IDs.
- `Select`: styled Radix menus with keyboard navigation/typeahead, selected indicators, disabled options, scroll controls and dialog-aware portals.
- `NumericInput`: keeps editable text separate from the displayed numeric value; focus selects the current value and clearing/replacing zero remains possible. Blur reconciles with the saved value.
- `HeightInput`: optional cm or separately labeled Feet/Inches fields following the profile units; switching display preserves the canonical cm measurement.
- `EquipmentInventory`: No equipment is the first choice. Selecting it clears other choices and disables their controls, custom additions and equipment-specific settings until unchecked.
- `Sheet`: native modal `<dialog>` with a close button, Escape support, backdrop and constrained scrolling; browser dialog behavior provides modal focus handling.
- `Empty`: plain, descriptive empty-state text and an optional action.
- `Toasts`: short feedback in a polite live region.

Form inputs and main buttons generally have a minimum height of 46 px. Some secondary filter chips are smaller; passing an accessibility check does not imply every control exceeds the same touch-size target. Visible keyboard focus uses a 2 px accent outline with spacing. Native inputs and Radix choices retain keyboard/screen-reader semantics; physical Safari/VoiceOver behavior needs separate validation.

Onboarding presents five stages—basics, rhythm, equipment, optional tools and review—with **Use defaults** / **Skip for now** actions. Optional measurements, experience/goals, training preferences, limitations and inventory details are visible in labeled groups. The form body scrolls, resets its scroll position between steps, and retains a visible Continue/Back/defaults footer. Review exposes the workout preset and optional starter calendar choice. Saved profile/equipment choices remain editable in Settings.

Program application has a date preview, first-workout alignment option and a clear choice to keep existing plans or replace only unstarted entries. Optional phase controls group week ranges with rep/set/load targets. This makes the calendar effect reviewable before saving.

Program cards have 24px padding and 18px separation; the smallest phones use 18px padding. Titles, date/phase metadata, workout names and actions have distinct spacing. Empty programs explain that a workout must be added before scheduling.

## Workout library management

Every starter workout uses a distinct appropriate glyph. A compact selected-icon control opens a 22-glyph library covering lifting, muscle groups, bodyweight, cardio, mobility, recovery and home training. Glyphs share rounded strokes; choices use labeled native buttons with `aria-pressed`, visible focus, live selection feedback and touch targets of at least 44px. Icons supplement actual muscle labels rather than replacing them. Old backups without an icon infer a useful default by starter ID or focus.

Plan and Train libraries default to **Recently saved**; name, focus and duration are explicit alternative sorts. New workouts, duplicates and shortened versions appear at the top of the default order. Sorting returns a separate list and preserves the original order when timestamps tie.

**Delete workout** opens a concrete impact review and a cancel action. Confirmation removes the template record, unstarted planned/skipped calendar entries and program references. Saved sessions and the active workout keep their exercise/set snapshots; linked calendar entries resolve their title from the session after the template is removed. A completed calendar record without a recoverable session prevents deletion and explains the alternatives. Independently frozen phase copies remain saved workouts. Archive remains a separate reversible option.

## Workout behavior

Today's overview lists each movement's primary/secondary muscles, planned sets/ranges/rest and completion state. Tapping a movement opens focused logging with a large exercise name, target summary, technique access and aligned set rows. The next unfinished set receives a visible emphasis. Exercise focus is saved with the session and can resume after reload.

Stored load conventions are labeled beside targets (per dumbbell, total, added load, machine stack or assistance). Cardio shows editable minutes/km while persisted duration remains seconds; isometric holds use seconds. Completion uses check states with accessible pressed labels. Warm-up/skipped states remain visible rather than disappearing from history. Prior performance stays secondary to current inputs.

The rest timer uses a large readable countdown plus start/pause/reset and ±30 second actions. A timestamp drives elapsed time. Haptic feedback is attempted only where supported; the PWA does not claim guaranteed iPhone vibration or background alert delivery. Group names support superset/circuit organization without hiding the underlying exercises/sets.

Completing a focused exercise's last unfinished set returns to the overview so the next movement can follow available equipment rather than the plan's order. Rest and recorded values stay intact. Saving a new workout returns to Train → Today with a compact review action; historical corrections keep the summary view.

Passive mouse explanations wait 700 ms, cancel when the pointer leaves, and restart the delay on a different control. The narrower passive card prefers space above its source and passes clicks through to the underlying interface. Keyboard focus and explicitly opened explanations remain immediate; explicit cards retain their close, exit and scroll controls.

## Data presentation

Trend charts use thin SVG lines, minimal gridlines and inspectable points. The selected point shows its value/date. Keyboard-accessible points and a data-table disclosure provide additional access to plotted values. Muscle analytics distinguish direct sets, heuristic indirect contributions and training-day frequency. Empty charts invite actual logging and never draw fabricated training points.

Goal bars show numeric values and percentages; decreasing goals use the same directional calculation. Supported weight goals show editable baseline/rate/weeks/date assumptions, an explicitly labeled estimated date and a separate fixed manual deadline when chosen. The first reached date is shown only when recorded goal history crosses the target. Records are named according to measurement semantics rather than displayed as an undifferentiated strength score. Optional motivational tiers explain their informal assumptions and can be customized per lift; the gamification milestone list starts collapsed.

Nutrition shows actual logged calorie/macro values and native progress bars against editable targets. It avoids a duplicate decorative calorie ring. Summary graphics stay subordinate to the diary and recorded values.

## Motion and accessibility

Transitions are brief and restrained, mainly for controls, sheets and feedback. Styles honor `prefers-reduced-motion`. Text/icons, numeric labels and completion states accompany color. Error messages use alert/live-region semantics where appropriate. Native forms remain keyboard operable.

Saving/errors are visible. Storage failure offers a recovery export while retaining unsaved edits. Full backup and destructive actions remain explicit in Settings.

Settings → Appearance persists accent and Comfortable/Compact spacing in the local profile and full JSON backup. Compact spacing reduces selected list/card padding while retaining readable controls. There is no separate font-scale preference; normal browser/device accessibility settings still apply.

The feedback-driven refinement and applied design-skill references are in [UI_REFINEMENT.md](UI_REFINEMENT.md). Visual QA, viewport coverage, accessibility results and retained screenshots are recorded in [TEST_REPORT.md](TEST_REPORT.md).
