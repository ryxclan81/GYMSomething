# Training calculations and evidence

Setwise's calculations are deterministic TypeScript in `src/domain/engine.ts`, `src/domain/planning.ts` and `src/domain/goalTimeline.ts`. No AI service is involved. These modules implement understandable configurable rules and planning arithmetic, rather than a clinically validated predictive model. Population research informs the design; it does not prove that any particular increment, set threshold, or program is optimal for an individual.

## Evidence reviewed

Sources below were checked against their primary publication records during implementation on October 10, 2026.

- **ACSM position stand, 2026.** Currier and colleagues synthesized 137 reviews. Progressive resistance training improves multiple outcomes; load, volume and other choices can affect specific adaptations. This supports editable, goal-specific training and multiple equipment modes. It does not validate Setwise's decision thresholds. [Publication record](https://pubmed.ncbi.nlm.nih.gov/41843416/), DOI: 10.1249/MSS.0000000000003897.
- **Schoenfeld, Ogborn and Krieger, 2017.** The meta-analysis supports a relationship between weekly resistance-training volume and hypertrophy. Setwise therefore reports direct sets separately from indirect contributions and external load. It does not convert set counts into promised growth. [Publication record](https://pubmed.ncbi.nlm.nih.gov/27433992/), DOI: 10.1080/02640414.2016.1210197.
- **Refalo and colleagues, 2023.** The review does not establish momentary muscular failure as universally superior to non-failure training for hypertrophy. The app never requires failure to earn progression or an achievement. [Publication record](https://pubmed.ncbi.nlm.nih.gov/36334240/), DOI: 10.1007/s40279-022-01784-y.
- **Robinson and colleagues, 2024.** Exploratory meta-regressions suggest that proximity to failure may relate differently to strength and hypertrophy; the estimated RIR methodology and exact relationship remain uncertain. Recorded RIR/RPE are context and optional gates, not objective recovery measurements. [Publication record](https://pubmed.ncbi.nlm.nih.gov/38970765/), DOI: 10.1007/s40279-024-02069-2.
- **Nishi and colleagues, 2024.** Gamification added to health applications produced modest changes in some outcomes across varied trials. This informs optional milestones and rest-day-aware consistency; these studies did not evaluate Setwise or prove that its particular badges improve training. [Publication record](https://pubmed.ncbi.nlm.nih.gov/39764571/), DOI: 10.1016/j.eclinm.2024.102798.

## Units and resistance semantics

Stored external load is kilograms. The exact conversion is `1 lb = 0.45359237 kg`; conversion does not round persisted resistance data. Height is stored in centimeters and may be entered as cm or feet/inches using `1 inch = 2.54 cm`. Display rounding is independent; switching profile units does not re-save a rounded height. Neither optional height nor bodyweight is used to invent calorie needs or diagnose health.

Exercises distinguish total barbell/external load, per-hand dumbbell load, displayed machine-stack load, added bodyweight load, assistance, and no external load. Records only compare the same exercise and stored measurement convention. Different machines, exercise variants, leverages and technique are not interchangeable. Equipment-environment changes interrupt automatic success windows.

`volumeLoad` is external resistance multiplied by logged repetitions, in kg·reps. For a source exercise explicitly tagged `two-implements`, simultaneous dumbbells count twice the per-hand load. A unilateral exercise counts one implement; its notes instruct the user to log each side separately. Added load is counted without inventing a body-mass contribution. Unweighted bodyweight, assistance, holds and cardio produce zero external volume. Machine-stack volume describes the recorded stack, not joint torque or actual effective resistance. Aggregated external volume is descriptive and should not be compared as a strength score between unrelated movements.

Working totals include completed, non-skipped, non-warm-up, nonempty set entries. Drop sets, AMRAP, failure, timed and other logged categories remain distinguishable in history but each recorded entry counts as one set event. Rest-pause/myo-rep mini-sets and separately logged unilateral sides are not scientifically calibrated equivalent straight sets. Users should keep their logging convention consistent.

## Estimated 1RM

Epley is implemented as `load × (1 + repetitions / 30)` for 2–10 repetitions. A one-repetition entry uses the actual recorded load. The 10-repetition limit is a conservative software policy, not a universal validation boundary.

The estimate is available only for positive, finite weight-repetition loads with total/per-hand/machine semantics. Warm-ups, unfinished/skipped sets, assistance, added-load bodyweight movements, cardio, duration sets, zero loads, fractional repetitions and higher-repetition sets are excluded. Per-hand estimates remain per hand. An estimate from a submaximal set may underestimate capacity; no assumption that RIR perfectly corrects it is made. Formula error varies by movement and athlete. Setwise never labels this estimate a tested maximum.

## Progression rules

Recommendations are pending records, not automatic edits. Accepting a recommendation is an explicit user action. Dismiss and snooze decisions are retained by the application store. The engine leaves prescriptions and histories unchanged.

The success window consists of the most recent configured number of completed sessions containing the same exercise and measurement convention. It requires the configured number of qualifying working sets in each session, the prescribed load, comparable equipment environment, and configured effort limits. An unset zero-load starter prescription can use a single consistently logged positive load as its baseline; the explanation identifies this inference and the original snapshot is preserved. A nonzero planned load remains strict. The threshold cannot exceed prescribed sets. A missing RIR/RPE blocks an increase when the corresponding effort condition is configured; ordinary logging with gates disabled remains usable without effort data.

| Strategy                    | Behavior                                                                                                                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Double progression          | Upper rep threshold across the required sets/sessions suggests the configured load increment.                                                                                                                   |
| Linear load                 | Minimum rep threshold across the required sets/sessions suggests the configured increment.                                                                                                                      |
| Repetition                  | Current upper target must be achieved; increase that target by one, capped at the rule's upper ceiling.                                                                                                         |
| Set volume                  | Upper rep threshold suggests one optional additional set with low confidence. Ten sets triggers review rather than another increase.                                                                            |
| RIR / RPE                   | Requires actual recorded effort meeting the relevant configured limit, plus repetition and comparable-load criteria.                                                                                            |
| Percentage of estimated 1RM | Requires an explicit 30–95% setting and eligible recent sets; uses the lowest eligible estimate in the success window, with low confidence. This percentage means fraction of e1rm, not a percentage increment. |
| Duration / distance         | Achieved target across the success window suggests a configured positive increment of at most 10%. No default pace escalation is inferred from distance.                                                        |
| Skill                       | Achieved rep/hold targets produce an optional technique/variation review; variants never inherit loads or history.                                                                                              |
| Time review                 | Comparable older history without a higher recorded load triggers a review. Elapsed time alone never increases load.                                                                                             |
| Manual                      | No automatic suggestion.                                                                                                                                                                                        |

For assisted bodyweight exercises, an achieved load strategy suggests **less assistance**, never a heavier assistance value. An ordinary Epley estimate is not applied.

Defaults (two successful sessions, three sets, 8–12 reps, +2.5 kg, seven-day interval) are editable starter heuristics. They are not research-derived universal thresholds. The minimum-time gate uses the earliest recorded exposure in the uninterrupted current-load history, because a separate load-change timestamp is not passed into this function. It is a conservative observation interval, not a guarantee of elapsed time since accepting a suggestion. Choose feasible equipment increments and review prescription-specific settings.

Plateau review requires at least three and normally four comparable sessions with no improvement in best repetitions at the current load below the upper target. The review can suggest examining technique, recovery, training volume or a lighter week. It neither diagnoses fatigue nor infers illness, sleep or readiness from missing data. Notes/annotations remain available for user interpretation. The engine does not automatically prescribe deload percentages or change programs.

## Planned blocks and phases

Program application previews real calendar dates before adding planned workouts. Optional non-overlapping phases supply explicit repetition ranges and percentages of a base template's sets/load. Repetition overrides do not apply to duration/cardio movements. Phased targets are copied into separate editable template versions when applied, and do not rewrite base workouts or completed/active session snapshots.

A selected lighter week multiplies sets by 0.67 and load by 0.9, combined with any selected phase multiplier. Set counts are rounded and kept at least one; target load is rounded to 0.01 kg. These are transparent starter heuristics selected by the user, not evidence-derived optimal deload prescriptions or a response to measured fatigue. Scheduling or phases do not run an adaptive periodization model and do not independently approve progression suggestions.

## Muscle contributions and consistency

Each primary muscle receives one direct contribution per logged working set event. A secondary muscle receives `indirectFactor` (default 0.5, configurable between 0 and 1), excluding duplicates and primary/secondary overlap. This factor is an explicit accounting heuristic, not a validated physiological conversion. Cardio and mobility entries are excluded from resistance set analysis. Historical snapshot muscle metadata is used so catalog edits cannot rewrite earlier analytics. Frequency counts distinct local calendar training days for a muscle.

Streaks count consecutive local calendar weeks meeting the configured **training-day** target. Multiple workouts on one day count as one training day. The unfinished current week has a grace period until its week ends, so rest days do not break a streak. A completed missed week ends it. Future, duplicate, empty and incomplete sessions are excluded. Planned breaks and historical target changes are not modeled as automatic streak exceptions in this version.

## Goals, records and tiers

Goal calculations use saved history; new installations have no fabricated progress. Increasing and decreasing numeric goals use `(current − start) / (target − start)`, clamped to 0–1. Custom and skill levels are user-entered. Bodyweight trends use the most recent saved measurement. Frequency and muscle-volume goals use the current local calendar week; distance goals sum saved cardio distance, pace goals use the fastest recorded positive-distance effort. Pace goals should compare similar courses/distances rather than treating every effort as equivalent. Duration/hold goals use a best logged interval/hold.

Bodyweight, loaded-weight and e1rm goals in kg/lb offer an optional time estimate. In rate mode, planning weeks equal remaining directional weight divided by the chosen positive weekly change. In duration mode, the chosen weeks determine the implied rate. The estimated calendar date is the saved anchor date plus the rounded-up number of planning days. Baseline, rate, weeks and date are editable. A manual deadline remains fixed when assumptions change. This assumes steady change and is not a performance or physiological forecast; editing the baseline does not record a measurement.

The initial bodyweight-loss example is 0.5 kg/week, within the general gradual-loss context described by the [CDC](https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html), checked October 11, 2026. It is not an individual prescription. The initial 0.25 kg/week gain and 2.5 kg/week lifting examples are editable planning assumptions, not evidence-backed recommended rates. The lifting estimate is independent of training progression rules; strength gains are not linear.

The displayed **First reached in goal history** date is the earliest recorded value meeting the current target in the goal's intended direction. It is separate from the estimated date, reflects only recorded goal history, and does not reconstruct unlogged progress. Changing the target may change that derived crossing date.

Relative-strength goals use eligible total-load e1rm divided by a known positive bodyweight. They do not combine unrelated machine or per-hand estimates into a single universal rank. Records include load, reps at a particular load, eligible e1rm, bodyweight reps, least assistance, hold duration, distance and pace as appropriate to the exercise.

`strengthTier` exposes optional customizable lift-specific ratios for ordinary barbell bench, squat and deadlift only. Its default labels and ratios are informal motivational benchmarks, not population norms or scientific classifications. They do not adjust for age, sex, technique, tested versus estimated load, disability, or competition standards. Other lifts require explicit user-supplied thresholds; no universal tier is assigned automatically.

## Validation and known boundaries

`tests/engine.test.ts` exercises unit conversion, formula boundaries, external-load semantics, warm-up exclusion, direct/indirect attribution, duplicate history, equipment requirements, substitutions, every progression strategy, effort/timing thresholds, assistance direction, descending goals, relative strength, cardio records, weekly streaks/rest days, milestones, source integrity and default-data isolation. Additional source tests in `src/domain/planning.test.ts`, `src/domain/goalTimeline.test.ts` and `src/components/HeightInput.test.ts` cover calendar/target protection, estimate arithmetic, manual dates, recorded crossings and measurement conversion. Executed results remain separately documented in [TEST_REPORT.md](TEST_REPORT.md).

These tests verify deterministic software behavior. They do not validate training efficacy, injury prediction, recovery scores, calorie needs or medical outcomes. Starter equipment profiles are clearly labeled examples and should be edited to the actual environment. The equipment function determines movement compatibility and can optionally compare a prescribed per-hand load with the inventory maximum; when no target is passed it cannot infer an appropriate load.
