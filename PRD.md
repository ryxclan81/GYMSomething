# MASTER PRODUCT REQUIREMENTS DOCUMENT & BUILD PROMPT
## Project: Scientific Fitness & Training App
**Platform:** iOS-first Progressive Web App (PWA), with future native iOS support  
**Primary device:** iPhone 16 Pro  
**Development:** React, TypeScript, PWA, Capacitor-ready  
**Product category:** Workout tracking, training planning, exercise education, performance analytics, and optional nutrition  
**Status:** Build the complete application  
**Date:** October 2026

---

# 0. YOUR ROLE AND EXECUTION INSTRUCTIONS

You are acting as a senior full-stack engineer, iOS application architect, product designer, UX specialist, and evidence-based fitness software developer.

Your job is to **design, implement, test, refine, and deliver a complete, functional fitness application** based on this specification.

This is not a request to generate a PRD, wireframes, scaffolding, or a proof of concept alone. The PRD is provided here. Your primary deliverable is the working application.

## Critical execution instructions

1. Read and understand this entire specification before beginning implementation.
2. Inspect the existing repository. If it is empty, initialize the project.
3. Create a maintainable architecture and implement the features described below.
4. Work through all development stages in one continuous workflow. Do not stop after each stage to ask permission.
5. Make reasonable engineering decisions independently when details are unspecified.
6. Favor actual working functionality over placeholder buttons, decorative mockups, or simulated integrations.
7. Follow the existing repository's conventions when appropriate, but do not preserve poor architecture merely for consistency.
8. Test the application, investigate failures, and fix issues before declaring completion.
9. Do not install paid services, enable billing, purchase subscriptions, or require an Apple Developer Program membership.
10. Do not expose API keys, access tokens, or user-sensitive information in the application bundle or source control.
11. Avoid unnecessary dependencies and unnecessary backend infrastructure.
12. Document unavoidable third-party restrictions, credentials, hardware requirements, and platform limitations honestly.
13. Do not claim a feature is functional if it is a mock, a placeholder, blocked by a third-party service, or untested.
14. Do not block the whole application because an optional integration is unavailable.
15. Continue implementing other independent requirements even when one feature encounters a restriction.

**Important:** Development stages are organizational checkpoints, not separate requests. Execute them sequentially or in parallel where appropriate, without requiring further user messages.

At completion, provide a factual implementation report covering functional features, test results, limitations, and exact installation instructions.

---

# 1. PRODUCT VISION

Build a premium-quality, dark-mode-only, scientifically informed fitness application.

The application should function as an all-in-one personal training system that helps users:

- Plan their weekly training.
- Build and customize workout programs.
- Log exercises, sets, repetitions, weights, and effort.
- Track strength, hypertrophy, muscular endurance, cardiovascular fitness, and calisthenics.
- Understand long-term progression.
- Receive transparent, evidence-informed progression recommendations.
- Track measurable goals and achievements.
- Train using commercial gym equipment or a personalized home-equipment inventory.
- Learn proper exercise technique.
- Maintain training consistency.
- Optionally receive fitness assistance through AI.
- Optionally track calories and nutrition.
- Optionally control Spotify during workouts.

The application should be usable by beginners, intermediate lifters, and advanced athletes.

It must offer advanced configuration without imposing complexity on people who only want to track sets and reps.

## Product philosophy

**Extremely simple during a workout. Extremely powerful outside a workout.**

During a workout, the user should be able to log a set almost instantly.

Outside a workout, the user should have access to flexible training programming, detailed statistics, exercise education, and goal management.

The application must feel like a polished consumer iOS product, not a generic administrative dashboard.

## Non-negotiable principles

- Dark mode exclusively.
- Mobile-first, optimized for iPhone.
- Visually inspired by WHOOP, without copying protected assets or layouts.
- Modern, restrained, clean, and premium.
- Workout functionality is always the priority.
- Offline-first.
- Local-first data ownership.
- No required subscription.
- No mandatory account.
- No required paid APIs.
- AI is optional, off by default, and noninvasive.
- Nutrition is optional and separated from workout functionality.
- Gamification supports consistency without dominating the experience.
- All recommendations should be explainable.
- Preserve a path to App Store publication.
- Accessibility and privacy are core requirements.

---

# 2. TARGET PLATFORM AND ARCHITECTURE

## 2.1 Initial platform

Build an installable PWA optimized for the iPhone 16 Pro.

The user has access to a Mac only occasionally and does not want to purchase an Apple Developer Program membership at this time.

The application must therefore support daily personal use without requiring seven-day native development provisioning renewals.

## 2.2 Recommended stack

Use the following stack unless repository constraints justify a clearly better alternative:

- React
- TypeScript with strict type checking
- Vite
- Tailwind CSS with a custom design-token system
- Accessible headless UI components where useful
- Lucide icons or similarly consistent icons
- React Router or an appropriate lightweight routing solution
- Dexie and IndexedDB for persistent local data
- Zustand or equivalent lightweight state management
- React Hook Form and Zod where appropriate
- Recharts or a similarly lightweight charting library
- Vitest for unit and integration tests
- Playwright for end-to-end testing
- A versioned service worker and web app manifest
- Capacitor for the future iOS native wrapper

Use current stable and maintained library versions.

Do not add a backend unless a specific feature requires one.

## 2.3 Architectural separation

Separate the application into:

1. Presentation and design system
2. Navigation and application state
3. Workout and exercise domain models
4. Training-program management
5. Training-session recording
6. Scientific progression engine
7. Goal and achievement engine
8. Local persistence and migrations
9. Exercise-content repository
10. Equipment matching and substitutions
11. Nutrition domain
12. Optional AI provider adapters
13. Optional speech-command adapters
14. Optional music-provider adapters
15. Notifications and reminders
16. Native-platform capability adapters
17. Data import/export and backup

Keep business logic independent of React components.

Do not tightly couple algorithms to the database implementation or user interface.

## 2.4 Native-readiness requirements

Structure the application so it can later be wrapped with Capacitor and enhanced with native Swift plugins.

Potential future native integrations:

- Apple Foundation Models
- HealthKit
- Apple Watch
- App Intents and Siri
- Live Activities
- Dynamic Island
- Native haptic feedback
- Native notifications
- Spotify App Remote
- Native camera and speech recognition

Do not pretend these native-only capabilities are available in the PWA.

Use capability detection and graceful fallbacks.

If macOS/Xcode are unavailable in the development environment, prepare and document the iOS integration rather than claiming to have tested a native build.

---

# 3. VISUAL DESIGN SYSTEM

This is one of the most important requirements.

Previous generic fitness dashboard concepts were rejected because they looked outdated, cluttered, excessively card-based, and used unattractive colors.

The visual direction should be substantially closer to the premium, minimalist aesthetic of WHOOP.

## 3.1 Design identity

Create a unique visual identity inspired by:

- WHOOP's information hierarchy
- Refined, data-driven health and performance interfaces
- Premium modern iOS applications
- High-quality typography
- Editorial spacing
- Minimal but expressive data visualization

Do not duplicate WHOOP's branding, proprietary imagery, exact screens, or trademarked elements.

## 3.2 Color direction

Dark mode is mandatory, with no light-mode toggle required.

Use a cohesive palette similar to:

- Background: deep obsidian, approximately `#0B0D10`
- Raised surfaces: charcoal, approximately `#151A1F`
- Secondary surfaces: graphite, approximately `#1C232A`
- Primary text: soft white, approximately `#F3F6F8`
- Secondary text: cool gray, approximately `#98A3AD`
- Main accent: restrained cool aqua or muted blue-green, approximately `#69C7BD`
- Alternative accent: refined steel blue
- Success: muted green
- Warning: controlled amber
- Error: restrained coral

These are starting guidelines, not mandatory final colors.

Refine the palette based on the visual result. Prioritize visual harmony and sufficient contrast.

Avoid neon lime-green as the main theme, excessive saturated colors, rainbow dashboards, heavy gradients, and overly colorful badges.

## 3.3 Typography

Use a premium modern typeface appropriate for iOS, such as a system font stack inspired by San Francisco or a properly licensed alternative.

Establish a clear hierarchy:

- Large, prominent performance numbers
- Strong but understated section headings
- Legible workout labels
- Quiet secondary information
- Consistent numeric alignment
- Appropriate weights rather than excessive bold styling

## 3.4 Layout principles

- Use generous whitespace.
- Avoid unnecessary nested cards.
- Prefer subtle surface changes over thick borders.
- Use restrained corner radii.
- Make primary actions unmistakable.
- Keep supporting controls visually secondary.
- Maintain consistent spacing using design tokens.
- Respect the iPhone safe areas.
- Ensure the keyboard does not obstruct workout logging.
- Keep important actions reachable with one hand.
- Provide accessible touch targets.
- Use restrained animations and haptics.
- Avoid horizontal overflow.
- Use polished loading, empty, error, and offline states.

## 3.5 Charts

Charts should be elegant and genuinely useful.

Use:

- Thin trend lines
- Clear numerical labels
- Restrained highlighting
- Minimal gridlines
- Useful tooltips
- Sensible axis scales
- Appropriate aggregation intervals
- Accessible distinctions beyond color alone

Avoid decorative charts that communicate no useful data.

## 3.6 Motion

Implement subtle motion for:

- Screen transitions
- Completing a set
- Saving changes
- Expanding exercise details
- Personal records
- Starting and ending workouts
- Rest-timer transitions
- Progress updates

Support reduced-motion accessibility settings.

Do not add distracting animations during workout logging.

## 3.7 Design-quality checkpoint

Before considering visual implementation complete:

- Review all primary screens together.
- Check consistency of typography, spacing, colors, controls, and navigation.
- Examine mobile screenshots.
- Compare the quality against modern premium fitness apps.
- Remove generic dashboard patterns and unnecessary cards.
- Refine visual details instead of stopping when basic layout is functional.

The result should feel like one coherent application.

---

# 4. INFORMATION ARCHITECTURE AND NAVIGATION

## 4.1 Main navigation

Use a compact, fixed bottom navigation suitable for iPhone.

Primary destinations:

1. Home
2. Train
3. Plan
4. Progress

The Exercise Library should be easily accessible from Train, workout builders, and search.

If AI is enabled, display a discreet AI icon in the navigation or another consistent low-profile location.

If AI is disabled, remove its entry point.

No floating AI chat bubbles.

No unsolicited AI popups.

## 4.2 Nutrition navigation

Nutrition must never dominate the workout experience.

Provide access through a secondary menu, profile section, or an optional customizable navigation destination.

Users who disable nutrition should not encounter calorie information in training screens.

## 4.3 Required screens

Build at minimum:

- Home dashboard
- Onboarding and training preferences
- Training profile editor
- Equipment profiles and inventory
- Active workout
- Workout summary
- Weekly planner
- Workout-template editor
- Training-program editor
- Exercise library
- Exercise detail
- Custom exercise editor
- Progress dashboard
- Exercise performance history
- Muscle-group volume analysis
- Goal manager
- Goal details
- Personal records
- Achievements and streak history
- Nutrition dashboard
- Food diary
- Food search and barcode scanner
- Food detail and custom food editor
- Recipe and saved-meal editor
- AI settings and AI coach, when enabled
- Voice-control settings
- Spotify integration settings
- Reminders and notifications
- Application settings
- Data export/import/backup
- Privacy and data controls

Provide appropriate empty states for users who have no training history.

---

# 5. ONBOARDING AND TRAINING PROFILE

The application should offer useful onboarding without requiring an account.

Collect editable preferences.

## Profile fields

- Optional display name
- Preferred units: pounds/kilograms
- Height and bodyweight, optional
- Experience level
- Primary training goal
- Secondary goals
- Preferred training days
- Session duration
- Preferred workout split
- Available equipment
- Default rest time
- Preferred effort tracking: RIR, RPE, both, or neither
- Preferred progression strategy
- Exercise preferences
- Exercises to avoid
- Training limitations, as user-specified and without medical diagnosis
- Notification preferences
- Gamification preferences
- Nutrition enabled/disabled
- AI enabled/disabled
- Voice enabled/disabled
- Spotify enabled/disabled

## Training focuses

Support:

- Hypertrophy
- Maximal strength
- Muscular endurance
- Cardiovascular fitness
- Calisthenics
- General fitness
- Hybrid training
- Custom goal combinations

Allow users to change goals without losing historical data.

Do not force the user to commit to a single discipline.

---

# 6. HOME, GYM, AND EQUIPMENT MODES

This is a core requirement.

## 6.1 Equipment profiles

Support multiple saved equipment environments.

Examples:

- Commercial Gym
- Home Gym
- Hotel Gym
- Travel
- Outdoor Training
- Custom Setup

A user should switch between profiles quickly.

## 6.2 Equipment inventory

Let users specify available equipment, including:

- No equipment
- Exercise mat
- Resistance bands
- Pull-up bar
- Dip bars
- Adjustable dumbbells
- Fixed dumbbells
- Kettlebells
- Barbell
- Weight plates
- Adjustable bench
- Flat bench
- Squat rack
- Smith machine
- Cable machine
- Functional trainer
- Common selectorized machines
- Cardio machines
- TRX or suspension trainer
- Medicine ball
- Jump rope
- Parallettes
- Gymnastics rings
- Weighted vest
- Additional custom equipment

Support equipment-specific constraints, such as adjustable dumbbells with a maximum weight or a bench that cannot incline.

## 6.3 Exercise compatibility filtering

Every exercise should declare its required equipment.

Filter by:

- Current equipment profile
- Muscle group
- Movement pattern
- Training focus
- Difficulty
- Exercise type
- Available weight range
- User preferences
- Bodyweight-only option

Do not recommend exercises requiring unavailable equipment.

When an exercise is unavailable, clearly show why.

## 6.4 Smart substitutions

Allow users to replace an exercise based on:

- Primary muscle group
- Movement pattern
- Equipment availability
- Training objective
- Relative difficulty
- Available resistance

For example, if a program requires barbell bench press but the user is at home with dumbbells, suggest an appropriate dumbbell press variation.

Do not assume the same numerical load or performance history transfers between exercise variations.

## 6.5 Workout adaptation

When a user switches environments:

- Identify unavailable exercises.
- Suggest substitutes.
- Preserve original program templates unless changes are explicitly saved.
- Allow a one-session substitution.
- Allow a permanent program substitution.
- Keep exercise histories separate.
- Preserve set/rep targets where appropriate and clearly indicate changes.

---

# 7. EXERCISE LIBRARY

Provide an extensive, searchable, high-quality exercise library.

Aim for several hundred genuinely distinct and properly described exercises using legally reusable data. Prefer verified quality over artificially inflated counts.

Do not generate hundreds of inaccurate or repetitive placeholder entries merely to reach a numeric target.

## 7.1 Exercise coverage

Include:

- Barbell lifts
- Dumbbell exercises
- Cable exercises
- Machine exercises
- Kettlebell exercises
- Resistance-band exercises
- Bodyweight strength
- Calisthenics
- Plyometrics
- Mobility exercises
- Core exercises
- Cardio modalities
- Conditioning activities
- Isometric exercises
- Skill-based movements

## 7.2 Exercise metadata

Every exercise should support:

- Unique ID
- Name
- Common aliases
- Description
- Primary muscle groups
- Secondary muscle groups
- Movement pattern
- Equipment requirements
- Exercise category
- Difficulty
- Setup instructions
- Step-by-step execution
- Common technique mistakes
- Safety considerations
- Easier alternatives
- Harder progressions
- Equipment substitutions
- Video or demonstration image, where appropriately licensed
- Measurement type
- Default rep/time ranges
- User notes
- Favorites
- Historical workout data
- Source and attribution

## 7.3 Exercise search

Search should support:

- Partial names
- Aliases
- Common alternative terminology
- Muscle groups
- Equipment
- Movement patterns
- Exercise categories

Provide useful filters and sorting.

## 7.4 Exercise detail screen

An exercise detail should offer:

- Clean instructional visual
- Short summary
- Target muscles
- Setup and execution
- Common mistakes
- Variations
- Suitable alternatives
- Training history
- Personal records
- Current program usage
- Add to workout action

## 7.5 Custom exercises

Users must be able to create exercises that do not exist in the library.

Allow:

- Custom name
- Category
- Muscles
- Equipment
- Instructions
- Personal photos or videos
- Tags
- Measurement type
- Default targets
- Progression preferences
- Custom notes

Custom exercises must function exactly like built-in exercises in workout templates, tracking, history, and analytics.

Support editing, archiving, and safe deletion while preserving historical references.

## 7.6 Data licensing

Investigate reputable open exercise datasets, including wger where appropriate.

Verify actual terms before copying exercise text or media.

Store attribution and source information.

Do not scrape restricted proprietary fitness databases or copy unlicensed instructional videos.

Provide a credible exercise library even when third-party APIs are unavailable.

---

# 8. WEEKLY TRAINING PLANNER

Create a flexible weekly training management system.

## 8.1 Weekly calendar

Show a clear weekly view with:

- Scheduled workouts
- Completed workouts
- Missed workouts
- Planned rest days
- Workout names
- Workout status
- Estimated duration
- Training focus

## 8.2 Schedule operations

Users can:

- Assign a workout to a day
- Move workouts
- Swap days
- Duplicate sessions
- Skip a session
- Reschedule missed sessions
- Add rest days
- Change exercise order
- Adjust scheduled volume
- Start a workout early
- Complete workouts on a different day
- Save an unscheduled workout

Rescheduling should not corrupt the underlying program.

## 8.3 Program templates

Include editable starter templates such as:

- Full Body
- Upper/Lower
- Push/Pull/Legs
- Four-day Upper/Lower
- Five-day hypertrophy
- Strength-focused program
- Bodyweight program
- General fitness
- Hybrid strength/cardio

Templates are starting points, not guaranteed optimal programs.

## 8.4 Custom programs

Allow creation of:

- Named programs
- Program descriptions
- Weekly schedules
- Workout days
- Exercise lists
- Sets
- Rep ranges
- Target weights
- RIR/RPE targets
- Rest durations
- Supersets
- Circuits
- Training blocks
- Progression settings

## 8.5 Training blocks

Support multiweek programming, such as 4-, 6-, 8-, or 12-week blocks.

Allow:

- Block start/end
- Different phases
- Rep-range changes
- Planned volume adjustments
- Scheduled lighter sessions
- Program duplication
- Repeating blocks
- Program archives

## 8.6 Full and shortened workouts

Allow multiple versions of a session.

Example:

- Full Upper Body A: 75 minutes
- Short Upper Body A: 35 minutes

Prioritize essential exercises in the shortened version.

## 8.7 Versioning

An active workout must preserve a snapshot of its prescription.

Editing the program afterward should not silently rewrite completed session history.

---

# 9. ACTIVE WORKOUT EXPERIENCE

This is the most important interaction in the app.

Optimize heavily for speed, reliability, and minimal taps.

## 9.1 Workout screen

Display:

- Workout name
- Current exercise
- Exercise number and total count
- Previous performance
- Planned sets
- Planned rep range
- Actual weight
- Actual repetitions
- Optional RIR/RPE
- Rest timer
- Exercise notes
- Set completion controls
- Next exercise
- Workout elapsed time

## 9.2 Set logging

Support:

- One-tap completion
- Editable reps
- Editable weights
- Fast numeric entry
- Remembering previous set values
- Copying previous workout values
- Automatic progression to next set
- Undo
- Deleting sets
- Inserting sets
- Reordering sets
- Editing completed sets
- Marking skipped sets
- Saving partial workouts

## 9.3 Set categories

Support:

- Warm-up
- Working
- Drop set
- AMRAP
- Failure set
- Rest-pause
- Myo-reps
- Assisted set
- Timed set
- Custom set type

Warm-ups should be excluded from working-set calculations unless intentionally configured otherwise.

## 9.4 Resistance measurement semantics

Represent weights correctly.

Distinguish:

- Barbell load
- Per-dumbbell load
- Total external load
- Machine-stack load
- Added bodyweight load
- Assisted bodyweight
- Unweighted bodyweight

Do not silently mix these conventions in calculations.

## 9.5 Rest timer

Provide:

- Exercise-specific rest targets
- Automatic start after set completion
- Manual start, pause, and reset
- Increase/decrease duration
- Visual countdown
- Sound or haptic notification when available
- Persistence when navigating within the app
- Accurate elapsed-time handling after app backgrounding

Use timestamps for timer accuracy rather than relying exclusively on JavaScript interval callbacks.

## 9.6 Workout modifications

During a workout, users can:

- Add exercises
- Remove exercises
- Skip exercises
- Replace exercises
- Reorder exercises
- Modify targets
- Add sets
- Reduce sets
- Change weights
- Extend the session

## 9.7 Advanced workout structures

Support:

- Supersets
- Circuits
- Giant sets
- Timed intervals
- AMRAP sessions
- EMOM sessions
- Straight sets
- Rest-pause structures

Ensure appropriate set order and timer behavior.

## 9.8 Autosave and recovery

Persist workout changes immediately or through a reliable transactional strategy.

The user must not lose an active workout because of:

- Closing the app
- Switching applications
- Locking the phone
- Losing internet access
- Reloading
- Accidental navigation
- A normal app restart

On reopening, restore the current session and offer to continue or discard.

## 9.9 Workout completion

Provide a polished summary with:

- Total workout duration
- Exercises completed
- Working sets
- Total repetitions
- Volume load where meaningful
- Personal records
- Goal progress
- Optional session difficulty
- Optional notes
- Next scheduled workout

Allow corrections after completion.

Do not count a workout twice if the completion action is repeated.

---

# 10. SCIENTIFIC PROGRESSION ENGINE

This is a major product differentiator.

Implement a deterministic, explainable training engine that operates independently of AI.

The system should consider performance, prescribed targets, effort, time, and user preferences.

Never automatically increase weights or sets without an explicit rule and user approval.

## 10.1 Supported progression systems

Support:

1. Double progression
2. Linear load progression
3. Repetition progression
4. Set-volume progression
5. RIR-based progression
6. RPE-based autoregulation
7. Percentage-of-1RM prescriptions
8. Manual progression
9. Time-based progression review
10. Calisthenics skill progression
11. Cardio duration progression
12. Cardio pace or distance progression

## 10.2 Double progression

Example:

Bench press:

- 3 sets
- Target range: 8–12 repetitions
- Starting load: 135 lb

If the user reaches the upper rep target across the configured number of sets and sessions while meeting any effort/technique conditions, suggest a small weight increase.

For example:

Week 1: 135 × 10, 9, 8  
Week 2: 135 × 11, 10, 9  
Week 3: 135 × 12, 12, 12  
Next suggestion: increase to 140 lb if appropriate.

The exact thresholds and increments must be configurable.

## 10.3 Progression-rule editor

Users can configure:

- Progression strategy
- Target rep range
- Required successful sets
- Required consecutive successful sessions
- Minimum time between increases
- Load increment
- Percentage increment
- Minimum required RIR
- Maximum RPE
- Plateau threshold
- When to recommend a review
- Whether changes require confirmation

Support exercise-specific overrides.

## 10.4 Time-based review

Users should be able to configure rules such as:

"After two weeks without an increase, review this exercise."

However, elapsed time should initiate a review, not automatically prescribe higher loading.

The engine should distinguish:

- Progress is occurring
- Rep targets are being approached
- Target achieved
- Repeated stagnation
- Load may be excessive
- Data insufficient
- User deliberately maintaining performance

## 10.5 RIR and RPE

Allow recording repetitions in reserve (RIR) or rate of perceived exertion (RPE).

Never require them for basic logging.

Use effort estimates as contextual information, not perfect objective measurements.

## 10.6 Estimated one-repetition maximum

Implement estimated 1RM using a documented formula such as Epley where its assumptions are reasonable.

Show that the value is estimated.

Avoid applying ordinary resistance-training 1RM formulas indiscriminately to cardio, assisted lifts, isometric exercises, or arbitrary high-repetition sets.

Keep formula choice configurable if practical.

## 10.7 Weekly training volume

Compute working-set totals by muscle group.

Support direct and indirect muscle contributions through an explicit configurable mapping.

Provide a clear distinction among:

- Direct sets
- Indirect contributions
- Volume load
- Training frequency

Do not present all volume measurements as interchangeable.

## 10.8 Performance analysis

Track:

- Weight progression
- Rep progression
- Estimated strength progression
- Repetition personal records
- Best performance within rep ranges
- Weekly working sets
- Volume-load trends
- Training consistency
- Effort trends
- Workout duration
- Exercise frequency

## 10.9 Plateau detection

Detect repeated stagnation using configurable windows and appropriate comparisons.

Avoid treating one weak session as a meaningful plateau.

Allow users to annotate:

- Poor sleep
- Low energy
- Illness
- Travel
- Incomplete session
- Equipment change
- General notes

Do not diagnose medical conditions.

## 10.10 Deload and volume suggestions

Allow the app to suggest reviewing training volume or considering a lighter week after sustained fatigue-related or performance-related signals.

Recommendations must:

- Be conservative
- Explain their rationale
- Acknowledge uncertainty
- Remain optional
- Require approval

Do not present one training protocol as scientifically optimal for everyone.

## 10.11 Recommendation explanation

Every recommendation should state:

- What changed
- What data triggered it
- Why the suggestion was made
- How confident the rule is given available data
- Available alternatives
- Accept, modify, dismiss, and snooze options

Store recommendation history and user decisions.

---

# 11. GOALS AND PERFORMANCE DASHBOARD

## 11.1 Goal types

Support:

- Weight lifted
- Rep target
- Estimated 1RM
- Bodyweight-relative strength
- Weekly training frequency
- Consistency
- Muscle-group volume
- Workout duration
- Total cardio distance
- Running or cycling pace
- Cardiovascular duration
- Calisthenics skill level
- Isometric hold duration
- Body measurements
- Bodyweight goals, optional
- Custom numeric goals

## 11.2 Goal management

Each goal should include:

- Name
- Goal type
- Starting value
- Current value
- Target
- Unit
- Optional deadline
- Applicable exercise/activity
- Progress history
- Milestones
- Completion state
- Notes

Show progress without pretending achievement-date predictions are certain.

## 11.3 Analytics dashboard

Create useful views for:

- Today
- This week
- Four weeks
- Three months
- Six months
- One year
- All time
- Custom range

Charts must support appropriate filters.

## 11.4 Muscle-group analysis

Provide a visual representation of weekly muscle-group training distribution.

Allow inspection of:

- Direct sets
- Indirect contribution
- Frequency
- Changes over time
- Imbalances in programmed work

Avoid making diagnostic claims from training-volume data.

## 11.5 Personal records

Support different record types:

- Heaviest weight
- Most reps at a given weight
- Best estimated 1RM
- Longest hold
- Most strict bodyweight reps
- Fastest pace
- Longest distance
- Best cardio performance
- Other activity-specific records

Ensure PR comparisons use consistent exercise and measurement conventions.

---

# 12. CARDIO, CALISTHENICS, AND HYBRID TRAINING

Do not design the entire application exclusively around barbell training.

## 12.1 Cardio

Support:

- Running
- Walking
- Cycling
- Swimming
- Rowing
- Elliptical
- Stair climbing
- Jump rope
- HIIT
- Other custom activities

Track as applicable:

- Duration
- Distance
- Pace
- Speed
- Heart rate, if available
- Heart-rate zone
- Perceived exertion
- Intervals
- Work/rest periods
- Personal records
- Notes

Support manual cardio entries without any wearable device.

## 12.2 Calisthenics

Support:

- Bodyweight reps
- Added weight
- Assistance level
- Isometric hold duration
- Skill progression level
- Exercise variants
- Range-of-motion variants
- Tempo
- Custom skill milestones

Example progression paths:

- Assisted pull-up to strict pull-up
- Incline push-up to floor push-up
- Basic dip to weighted dip
- Tuck front lever to advanced variations
- Wall handstand to freestanding handstand

Treat progression trees as editable suggestions, not mandatory requirements.

## 12.3 Hybrid training

Support strength and cardio in the same schedule.

Users should be able to prioritize one goal while maintaining another.

Show conflicts or scheduling considerations as recommendations, not rigid prohibitions.

---

# 13. GAMIFICATION AND CONSISTENCY

Gamification should be useful, subtle, and visually secondary to training.

## 13.1 Training streaks

Support:

- Consecutive weeks meeting a planned training goal
- Monthly consistency
- Completed planned sessions
- Personal-best consistency periods
- Workout milestones

Rest days must not break streaks.

Allow reasonable handling of skipped weeks, schedule changes, and planned breaks.

Never reward unnecessary workouts merely to maintain a daily streak.

## 13.2 Achievements

Examples:

- First completed workout
- First full week
- Four consistent weeks
- Ten workouts
- Fifty workouts
- One hundred workouts
- New strength milestone
- New cardio milestone
- New calisthenics skill
- Completed program block
- Return after a break

## 13.3 Strength tiers

Implement optional strength classifications based on relative load:

Relative strength = lifted load / bodyweight

Allow lift-specific tiers.

Possible labels:

- Beginner
- Novice
- Intermediate
- Advanced
- Elite

Clearly identify tiers as configurable motivational benchmarks rather than universal scientific standards.

Account for exercise type, technique conventions, equipment, and whether a value represents an estimated or tested maximum.

Do not compare unrelated lifts using a single numerical tier system.

## 13.4 Rewards

Use:

- Small achievement animations
- Subtle badges
- Consistency progress
- Milestone celebrations
- Personal record highlights

Avoid excessive confetti, childish visuals, or competitive pressure.

## 13.5 Gamification settings

Allow users to disable:

- Streaks
- Achievements
- Strength tiers
- Celebrations
- Reminder personality

---

# 14. VOICE-CONTROLLED WORKOUT LOGGING

Voice control should reduce friction during workouts.

## 14.1 Interaction

Prioritize push-to-talk.

No continuously listening microphone.

Potential commands:

- "Log ten reps at 135 pounds."
- "I did eight reps."
- "Add another set."
- "Change the weight to 140."
- "Start a two-minute rest."
- "Skip this exercise."
- "What's next?"
- "What did I lift last time?"
- "How many sets are left?"
- "Finish workout."

## 14.2 Implementation

Create a speech-input adapter with feature detection.

Use browser speech capabilities when available.

Implement a deterministic command parser for common commands.

Do not require a large-language-model API for basic voice logging.

Ask for confirmation when a command is ambiguous or potentially destructive.

Provide immediate visible feedback and undo.

## 14.3 Failure behavior

If speech recognition is unsupported, unavailable, or inaccurate:

- Explain the limitation.
- Preserve manual logging.
- Allow command entry through text if useful.
- Never lose a set because recognition failed.

Keep future native speech recognition and Siri integration possible.

---

# 15. OPTIONAL AI FITNESS ASSISTANT

AI is an optional feature and must be **disabled by default**.

It is not the foundation of the application.

## 15.1 Placement and interaction

AI must be discreet.

Use a small bottom navigation button or similarly restrained entry point when AI is enabled.

Do not use:

- Floating chat bubbles
- Popups
- Automatic chat openings
- Unrequested coaching messages
- Persistent overlays
- AI banners on every screen

The user should initiate AI conversations.

## 15.2 AI capabilities

When enabled, support a conversational fitness assistant that can:

- Explain exercises
- Answer general training questions
- Explain hypertrophy versus strength programming
- Interpret the user's training history, with permission
- Explain progression recommendations
- Help explore workout alternatives
- Help adjust schedules
- Compare exercises
- Explain fatigue-management concepts
- Discuss training frequency
- Help create training plans
- Explain basic nutrition concepts
- Summarize personal progress
- Answer questions about the app's features

## 15.3 Privacy

Use explicit permissions for sending data to external models.

The assistant should not automatically access or transmit:

- Training history
- Body measurements
- Food diary
- Personal notes
- Profile details

Provide a clear, revocable opt-in for each relevant category or a well-explained granular permission system.

Do not send more data than needed.

## 15.4 Zero-cost policy

The developer must not incur per-request AI charges.

There must be no automatically enabled paid model or paid fallback.

Implement an AI provider abstraction supporting:

1. Disabled provider
2. Optional free-tier cloud provider, where securely configured
3. Future native on-device Apple Foundation Models adapter
4. Optional experimental local model adapter if viable

Investigate currently available Gemini free-tier models, quotas, data handling, and restrictions before choosing a provider.

Do not assume free-tier access is unlimited or permanent.

Do not require billing setup.

Do not embed an unrestricted shared API key in the PWA.

If secure cloud-provider access would require backend infrastructure, implement a safe optional integration architecture and document the configuration requirements.

Never sacrifice credential security merely to make the demo appear functional.

If cloud AI is unconfigured or quota-limited, show an honest unavailable state.

The rest of the app must remain fully functional.

## 15.5 AI behavior

The assistant should:

- Use provided workout data accurately.
- Cite or identify relevant evidence when making scientific claims.
- Distinguish research findings from heuristics.
- Avoid fabricated research references.
- Admit uncertainty.
- Avoid medical diagnosis.
- Avoid dangerous training prescriptions.
- Recommend consulting an appropriate professional when a question concerns injury or medical symptoms.
- Never modify user training records without explicit confirmation.

## 15.6 Explainable algorithms are not AI

Keep progression calculations, goal tracking, weekly volume analysis, scheduling rules, and achievement logic deterministic.

Do not call an LLM for calculations that can be performed reliably in ordinary code.

---

# 16. OPTIONAL NUTRITION AND CALORIE TRACKING

Build a comprehensive, optional nutrition module with depth comparable in concept to established food-tracking applications such as Lose It.

Do not copy their interface, branding, or proprietary databases.

Nutrition must not intrude into workouts.

## 16.1 Enable/disable

Nutrition is optional.

When disabled:

- Hide its navigation destination.
- Hide calorie widgets.
- Hide nutrition reminders.
- Do not show macro prompts.
- Do not interfere with workout functionality.

## 16.2 Daily nutrition dashboard

Support:

- Daily calorie target
- Calories consumed
- Protein
- Carbohydrates
- Fat
- Remaining targets
- Water tracking
- Optional fiber and micronutrients when reliable data exists
- Daily history
- Weekly trends

## 16.3 Food diary

Organize entries by:

- Breakfast
- Lunch
- Dinner
- Snacks
- Custom meals

Allow:

- Search
- Add
- Edit
- Delete
- Duplicate
- Move between meals
- Copy previous meals
- Save frequently eaten meals
- Favorite foods

## 16.4 Food database

Investigate and integrate legally appropriate data sources, including:

- Open Food Facts
- USDA FoodData Central

Respect current licenses, attribution, API requirements, and applicable usage limits.

Allow caching of previously accessed entries where permitted.

Do not assume nutrition records are complete or accurate.

## 16.5 Barcode and QR scanning

Support camera scanning for:

- UPC
- EAN
- Other supported product barcodes
- QR codes containing useful supported product identifiers or URLs

Do not assume all QR codes identify food products.

On successful scan:

1. Extract the identifier.
2. Search the supported food database.
3. Show the product.
4. Show nutrition and serving information.
5. Allow serving adjustment.
6. Allow adding the item to the diary.

If no product is found, allow manual entry or custom food creation.

## 16.6 Custom foods

Support:

- Food name
- Brand
- Serving size
- Serving unit
- Calories
- Protein
- Carbs
- Fat
- Optional nutrients
- Optional barcode
- Notes

## 16.7 Recipes and meals

Allow users to:

- Build recipes from ingredients
- Enter ingredient quantities
- Calculate recipe totals
- Define servings
- Save meals
- Reuse meals
- Adjust ingredient quantities
- Edit logged portions

## 16.8 Nutrition goals

Allow:

- Manual calorie target
- Protein target
- Carbohydrate target
- Fat target
- Bodyweight trend tracking
- Goal adjustments

Optional calculated targets must explain assumptions and remain editable.

Avoid recommending extreme restriction or presenting calorie estimates as exact measurements.

## 16.9 Optional AI/photo features

Photo-based food estimation may be explored through the optional AI provider.

Do not require AI to log food.

Clearly label photo-based estimates as uncertain and editable.

## 16.10 Privacy

Nutrition data stays local by default.

Do not share dietary information with an AI provider without explicit permission.

---

# 17. SPOTIFY INTEGRATION

Spotify is an experimental, low-priority convenience feature.

The initial user has Spotify Premium, but compatibility with Spotify Free users is desirable when technically and contractually supported.

## 17.1 Controls

Only essential controls are required:

- Play
- Pause
- Next track
- Previous track, if supported and useful

No full playlist browser is necessary.

## 17.2 User interface

Provide a small, optional, collapsible music control in the active workout.

Do not place music controls across the entire app.

Do not obscure workout logging.

## 17.3 Web integration

Investigate Spotify's current Web API, OAuth requirements, developer access restrictions, and Premium limitations.

Use secure OAuth with PKCE where appropriate.

Do not expose tokens.

Handle unavailable devices, expired sessions, authorization errors, and rate limits.

## 17.4 Spotify Free

Spotify's web playback-control endpoints have Premium restrictions.

Do not claim unsupported functionality for Free users.

For a future native iOS version, investigate Spotify's App Remote SDK and its permitted Free-user behavior.

Provide "Open Spotify" as a fallback when direct control is unavailable.

## 17.5 Independence

Spotify must never be required for:

- Starting workouts
- Logging sets
- Rest timers
- Saving training history
- Progression recommendations

Do not let music integration delays or failures block the product.

---

# 18. REMINDERS AND NOTIFICATIONS

Provide thoughtful, configurable reminders inspired by engaging applications such as Duolingo, while avoiding manipulative design.

## 18.1 Reminder types

- Upcoming scheduled workout
- Missed scheduled workout
- Weekly goal progress
- Return-to-training reminder
- Milestone celebration
- Program block completion
- Training review reminder
- Rest-timer completion

## 18.2 Preferences

Allow users to configure:

- Enabled reminder categories
- Reminder days
- Reminder time
- Frequency
- Quiet hours
- Tone/personality
- Snooze behavior

Support a friendly and motivational tone without guilt or shame.

## 18.3 Technical requirements

Use local in-app reminders where possible.

For PWA background notifications, account for browser installation, notification permission, service-worker requirements, and any necessary push infrastructure.

Do not pretend an ordinary PWA can guarantee scheduled background notifications without a suitable delivery mechanism.

Provide accurate capability messaging.

Keep native local notifications as a future Capacitor feature.

---

# 19. SETTINGS AND PERSONALIZATION

Create a comprehensive but organized settings system.

Include:

## Appearance
- Dark mode enforced
- Optional accent preferences
- Reduced motion
- Display density, where appropriate

## Training
- Units
- Default rest duration
- Rep-range defaults
- RIR/RPE preference
- Progression method
- Preferred weekly schedule
- Exercise defaults
- Equipment profiles

## Privacy and integrations
- AI enable/disable
- AI data permissions
- Cloud AI provider
- Voice controls
- Microphone permissions
- Nutrition enable/disable
- Spotify connection
- Notification permissions

## Gamification
- Streaks
- Achievement displays
- Strength tiers
- Celebration animations

## Data
- Export
- Import
- Backup
- Restore
- Clear selected data
- Delete all local data

## Information
- Version
- Privacy information
- Exercise-data attribution
- Nutrition-data attribution
- Research references
- Open-source notices
- App limitations

---

# 20. DATA MODEL AND PERSISTENCE

Use a typed, versioned database schema.

At minimum, model these entities:

- UserProfile
- UserPreferences
- EquipmentItem
- EquipmentProfile
- Exercise
- ExerciseAlias
- ExerciseMedia
- ExerciseAlternative
- WorkoutTemplate
- WorkoutTemplateExercise
- TrainingProgram
- TrainingBlock
- ScheduledWorkout
- WorkoutSession
- WorkoutSessionExercise
- WorkoutSet
- CardioSession
- SkillProgression
- ProgressionRule
- ProgressionSuggestion
- Goal
- GoalProgress
- PersonalRecord
- Achievement
- StreakState
- BodyMetric
- Food
- FoodServing
- FoodDiaryEntry
- Recipe
- RecipeIngredient
- SavedMeal
- NutritionGoal
- NotificationPreference
- AISettings
- AIPermission
- IntegrationConnection
- UserNote
- DataMigration

Refine relationships as needed.

## Data integrity requirements

- Use stable unique IDs.
- Track creation and modification timestamps.
- Handle local time zones correctly.
- Use explicit units.
- Use safe conversion logic.
- Distinguish planned versus actual training data.
- Preserve workout history after template edits.
- Avoid duplicate session completion.
- Support migrations between schema versions.
- Validate imported data.
- Provide rollback/recovery behavior for failed imports.
- Do not silently delete data when features are toggled off.
- Avoid cascading deletion of completed workouts when an exercise is archived.
- Preserve history even when external exercise sources change.

## Backup and export

Provide:

- Complete JSON backup
- JSON restoration
- CSV workout export
- CSV nutrition export
- Version information
- Import validation
- Clear warning before destructive operations

Because local browser data can be cleared, prominently offer backups without making them intrusive.

Consider optional sync in the future, but no account or cloud database should be mandatory for initial use.

---

# 21. OFFLINE-FIRST REQUIREMENTS

The core app must remain functional without internet access.

Offline capabilities must include:

- Opening installed app
- Viewing cached exercise library
- Starting workouts
- Logging sets
- Editing exercises
- Viewing previous workouts
- Using training programs
- Rescheduling sessions
- Tracking goals
- Running progression calculations
- Viewing locally stored analytics
- Viewing cached food records
- Creating manual food entries

Internet-dependent features may include:

- Live food database lookup
- Initial external image downloads
- Cloud AI
- Spotify integration
- Optional future cloud synchronization

Show clear but unobtrusive connectivity states.

Test offline operation after a real installed-app reload, not merely after briefly disabling the network during an already loaded session.

Use service-worker versioning and appropriate update behavior.

Avoid applying a disruptive app update during an active workout.

---

# 22. PERFORMANCE, ACCESSIBILITY, AND QUALITY

## 22.1 Performance

Optimize for iPhone 16 Pro and modern mobile browsers.

Targets:

- Fast initial usable render
- Responsive set logging
- Minimal layout shifts
- Smooth scrolling
- Efficient chart rendering
- Lazy-loaded secondary modules
- Sensible exercise-search performance
- Reasonable memory consumption

Measure performance rather than assuming it is acceptable.

## 22.2 Accessibility

Implement:

- Sufficient contrast
- Accessible labels
- Keyboard navigation where applicable
- Screen reader support
- Semantic controls
- Large touch targets
- Visible focus states
- Reduced-motion support
- Appropriate error descriptions
- Flexible text sizing where feasible
- Information not communicated exclusively through color

## 22.3 Error handling

Provide useful behavior for:

- Missing equipment
- Invalid set input
- Duplicate records
- Database errors
- Storage quota limitations
- Empty history
- Unsupported speech recognition
- Failed camera permission
- Missing food database results
- AI quota exhaustion
- Spotify authentication failure
- Offline external-service requests
- Interrupted imports
- Stale or corrupted cached assets

Errors should be recoverable where possible.

---

# 23. PRIVACY AND FUTURE APP STORE COMPLIANCE

Design with Apple's App Review Guidelines and platform expectations in mind.

This does not guarantee App Store approval, but should reduce avoidable redesign later.

## Requirements

- No mandatory account for local use.
- No forced subscription.
- Collect minimal personal data.
- Keep user data local by default.
- Ask for permissions only when needed.
- Explain permission use clearly.
- Allow revocation.
- Offer data export and deletion.
- Do not send personal data to AI without consent.
- Do not use copyrighted WHOOP or other app assets.
- Respect exercise and food-data licensing.
- Do not embed developer secrets.
- Avoid deceptive health claims.
- Avoid presenting fitness estimates as medical diagnoses.
- Make optional integrations clearly optional.
- Provide a future privacy-policy template based on actual data flows.
- Document any changes needed for native iOS packaging.

Prepare the Capacitor project structure where practical.

Do not require native signing or paid Apple developer enrollment during the PWA build.

---

# 24. EXPERIMENTAL AND FUTURE-READY FEATURES

These should not delay reliable core functionality, but the architecture should support them.

## 24.1 Automatic rep counting

Potential future approaches:

- Apple Watch motion data
- On-device motion models
- Camera-based repetition detection

Do not claim accurate automatic rep counting without exercise-specific evaluation.

The first-class logging method remains manual entry, with optional voice controls.

## 24.2 Apple Watch

Future potential features:

- Complete sets
- View current exercise
- View rest timer
- Record workouts
- Haptic notifications
- Heart-rate data where authorized

## 24.3 Apple Health

Future HealthKit synchronization for supported health and workout data.

Only access user-authorized categories.

Avoid duplicate writing or importing the same workout multiple times.

## 24.4 Siri and native controls

Future support for:

- Starting workouts
- Logging sets
- Starting rest timers
- Reviewing next exercise
- Lock Screen activities
- Dynamic Island rest-timer status

## 24.5 Enhanced training intelligence

Future possibilities:

- More advanced fatigue modeling
- Personalized program adaptation
- Training-performance forecasting
- Contextual exercise alternatives
- On-device AI coaching
- Recovery-related tracking

Do not claim these models are scientifically validated merely because they are implemented.

---

# 25. SCIENTIFIC FOUNDATION

Base training logic on credible peer-reviewed evidence.

Prioritize systematic reviews, meta-analyses, and major position stands.

Relevant starting sources:

1. American College of Sports Medicine (2026). *Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews.*  
   https://pubmed.ncbi.nlm.nih.gov/41843416/

2. Schoenfeld, Ogborn, and Krieger (2017). *Dose-response relationship between weekly resistance training volume and increases in muscle mass.*  
   https://pubmed.ncbi.nlm.nih.gov/27433992/

3. Refalo et al. (2023). *Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis.*  
   https://pubmed.ncbi.nlm.nih.gov/36334240/

4. Robinson et al. (2024). *Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy.*  
   https://pubmed.ncbi.nlm.nih.gov/38970765/

5. Nishi et al. (2024). *Effect of digital health applications with or without gamification on physical activity and cardiometabolic risk factors.*  
   https://pubmed.ncbi.nlm.nih.gov/39764571/

Research should inform the recommendation engine, not be used to present universal prescriptions.

Document assumptions for heuristic rules.

Allow customization because individual responses to training vary.

Where evidence is uncertain, the interface should reflect that uncertainty.

---

# 26. THIRD-PARTY TECHNICAL REFERENCES

Use current official documentation when implementing integrations.

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple Foundation Models: https://developer.apple.com/documentation/FoundationModels
- Capacitor: https://capacitorjs.com/docs
- Spotify developer documentation: https://developer.spotify.com/documentation/
- Gemini API: https://ai.google.dev/gemini-api/docs
- Open Food Facts: https://openfoodfacts.github.io/openfoodfacts-server/api/
- USDA FoodData Central: https://fdc.nal.usda.gov/
- WebKit PWA guidance: https://webkit.org/

Verify current API capabilities, restrictions, security recommendations, and license requirements before implementation.

---

# 27. TESTING REQUIREMENTS

Testing is mandatory.

## 27.1 Unit tests

Test:

- Weight-unit conversion
- Rep progression
- Double progression
- Rule thresholds
- Estimated 1RM
- Volume calculations
- Muscle-set contributions
- Goal calculations
- Strength-to-bodyweight ratios
- Streak logic
- Rest-day preservation
- Workout scheduling
- Exercise-equipment compatibility
- Food serving calculations
- Recipe nutrition totals
- Voice-command parsing
- Data validation

## 27.2 Integration tests

Test:

- Building a program
- Scheduling workouts
- Starting workouts
- Editing sessions
- Saving workouts
- Recovery after reload
- Logging exercise substitutions
- Recording custom exercises
- Updating goals
- Producing recommendations
- Tracking nutrition
- Barcode lookup handling
- Export/import
- Feature toggles

## 27.3 End-to-end tests

Create representative user journeys.

### Scenario A: New gym user
A new user completes onboarding, chooses hypertrophy, selects four training days, creates a program, starts a workout, logs sets, completes the workout, and views their history.

### Scenario B: Home gym
A user creates a home-equipment profile, switches to Home Mode, filters exercises, substitutes an unavailable movement, and completes a workout.

### Scenario C: Progressive overload
A user completes successful workouts across multiple sessions and receives an explainable load-increase suggestion. The user accepts or rejects it.

### Scenario D: Offline workout
A user starts a workout, loses internet access, logs sets, closes/reopens the app, resumes the session, and finishes without data loss.

### Scenario E: Custom exercise
A user creates a new exercise, adds it to a template, completes sets, and reviews the exercise history.

### Scenario F: Nutrition
A user enables nutrition, adds a food, adjusts serving size, builds a meal, scans or manually enters a barcode, and reviews totals.

### Scenario G: AI disabled
A user with AI disabled can access and use every essential training feature without AI controls appearing.

### Scenario H: Integration unavailable
Spotify, cloud AI, and camera recognition are unavailable. The app still functions normally.

### Scenario I: Data restoration
A user exports a full backup, clears a test database, restores the backup, and verifies historical records.

## 27.4 Visual testing

Test at:

- iPhone 16 Pro viewport
- Smaller iPhone viewport
- Larger mobile viewport
- Desktop browser

Review screenshots for:

- Spacing
- Typography
- Visual hierarchy
- Bottom navigation
- Safe areas
- Form usability
- Keyboard overlap
- Dark-mode consistency
- Overflow
- Chart legibility
- Empty states

## 27.5 Quality gates

Run:

- TypeScript checking
- Linting
- Unit tests
- Integration tests
- End-to-end tests
- Production build
- PWA manifest validation
- Service-worker and offline tests
- Accessibility checks
- Basic dependency/security checks

Fix errors and regressions that are within the project scope.

Report exact results.

---

# 28. REQUIRED DEVELOPMENT WORKFLOW

Implement the entire application in a continuous workflow.

## Stage 1 — Inspect and plan

- Inspect the repository.
- Identify existing code.
- Select final implementation details.
- Establish the design system.
- Create a realistic architecture.
- Record important decisions.

## Stage 2 — Build the application shell

- Routing
- Navigation
- Design tokens
- Common components
- PWA configuration
- Persistence layer
- Error handling
- Settings foundation

## Stage 3 — Build training features

- Exercise library
- Custom exercises
- Equipment profiles
- Home Mode
- Workout templates
- Weekly planner
- Active workout logging
- Rest timers
- Workout history
- Workout recovery

## Stage 4 — Build scientific training features

- Progression rules
- Goal management
- Personal records
- Analytics
- Muscle-group volume
- Cardio tracking
- Calisthenics
- Training blocks
- Performance recommendations

## Stage 5 — Build gamification

- Streaks
- Rest-day-aware consistency logic
- Milestones
- Achievements
- Strength tiers
- Optional celebrations

## Stage 6 — Build nutrition

- Food diary
- Database integrations
- Food search
- Barcode scanner
- Custom foods
- Recipes
- Meal management
- Macro targets
- Food history

## Stage 7 — Build optional integrations

- Voice commands
- AI provider abstraction
- Optional secure free-tier provider support
- AI interface and permissions
- Spotify integration
- Notifications and reminders
- Future native-adapter structure

## Stage 8 — Polish

- Refine all screens visually.
- Improve interaction speed.
- Fix inconsistent styling.
- Improve empty/loading/error states.
- Improve accessibility.
- Review responsive behavior.
- Remove redundant components and placeholder content.

## Stage 9 — Test and prepare delivery

- Run all tests.
- Fix implementation issues.
- Build for production.
- Verify offline behavior.
- Verify installation workflow.
- Document remaining external limitations.
- Prepare deployment and installation instructions.

Do not stop between stages unless user intervention is strictly required.

If access to a third-party service is required, implement the integration boundary and the rest of the product without blocking.

---

# 29. REQUIRED PROJECT DELIVERABLES

The repository should contain:

1. Working application source code
2. Reusable visual component system
3. Exercise library and attribution metadata
4. Local database schema and migrations
5. Workout tracking engine
6. Progression and analytics engine
7. Nutrition module
8. Optional integrations
9. Automated tests
10. PWA manifest and service-worker configuration
11. Capacitor-ready setup
12. README with installation and development instructions
13. `PRD.md` capturing the implemented product specification
14. `ARCHITECTURE.md` describing major modules
15. `DATA_MODEL.md`
16. `DESIGN_SYSTEM.md`
17. `SCIENTIFIC_BASIS.md` documenting training algorithms and evidence
18. `INTEGRATIONS.md` explaining external requirements and restrictions
19. `PRIVACY.md` describing actual data flows
20. `.env.example` without secrets
21. Deployment instructions
22. Instructions for installing the PWA through iPhone Safari
23. Future iOS/App Store preparation notes
24. A feature-completion matrix showing implemented, limited, blocked, and future-native functionality

Keep documentation accurate to the implementation.

---

# 30. DEFINITION OF DONE

The application is not complete merely because all screens exist.

The deliverable should satisfy the following functional requirements.

## Core experience

- The PWA can be installed on an iPhone.
- The app is dark-mode-only.
- The interface is visually polished and consistent.
- Navigation works.
- Workouts can be created.
- Exercises can be added or removed.
- Custom exercises work.
- Home equipment profiles work.
- Exercise filtering works.
- Weekly planning works.
- Sets and reps can be logged quickly.
- Workout data persists.
- Interrupted workouts can be resumed.
- Rest timers work.
- Workout history is accurate.

## Training intelligence

- Progression rules are configurable.
- Progression suggestions are explainable.
- Training history drives recommendations.
- Personal records are calculated correctly.
- Goals are tracked.
- Weekly training volume is calculated.
- Analytics use real saved data.
- Cardio is supported.
- Calisthenics is supported.

## Optional features

- Nutrition can be enabled and disabled.
- Food logging works.
- Barcode lookup is functional when a supported source and camera are available.
- Recipes and saved meals work.
- Gamification works and respects rest days.
- Voice controls work on supported platforms, with an honest fallback.
- AI is off by default and has no mandatory paid dependency.
- Spotify is optional and fails gracefully.
- Reminder behavior is accurate to the platform's capabilities.

## Reliability

- Core workouts work offline.
- No account is required.
- Backup/export works.
- Import/restore works.
- Sensitive credentials are not exposed.
- Unit/integration tests pass.
- The production build succeeds.
- Limitations are documented.

## Design

- The app does not look like a generic SaaS dashboard.
- Dark surfaces, typography, spacing, and charts form a coherent visual system.
- No unattractive neon-green theme.
- No invasive AI UI.
- No unnecessary card clutter.
- No nutrition clutter on training screens.
- Mobile interaction is smooth and intentional.
- Primary actions are fast and easy to reach.

---

# 31. IMPORTANT ENGINEERING RULES

Avoid these common failures:

- Do not replace functionality with mock data.
- Do not leave nonfunctional buttons.
- Do not hardcode fake statistics on the home dashboard.
- Do not label arbitrary numbers as scientific results.
- Do not make the workout experience depend on network connectivity.
- Do not force a sign-in screen.
- Do not create a paid backend by default.
- Do not expose API keys.
- Do not claim Spotify Free support where the API prohibits it.
- Do not fake voice recognition.
- Do not invent exercise instructions without checking quality.
- Do not silently lose user data.
- Do not auto-modify programs based on an AI response.
- Do not copy WHOOP's proprietary UI or branding.
- Do not overengineer simple features.
- Do not prioritize experimental AI over dependable workout logging.
- Do not conceal incomplete work.

Favor clean, production-quality implementation with conservative, understandable behavior.

When something cannot be implemented reliably under the platform or cost constraints, provide the best functional fallback and document the exact limitation.

---

# 32. FINAL INSTRUCTION

**Build the application now.**

Start by inspecting the repository, choosing the appropriate implementation details, and creating the foundational architecture.

Then implement the complete training system, scientific features, nutrition module, optional integrations, and polished interface in one continuous workflow.

Use your ability to inspect code, run tests, review screenshots, debug, and refine the implementation.

Prioritize functionality and engineering quality, but treat the visual design as a major requirement rather than an afterthought.

Make independent implementation decisions and avoid unnecessary clarification questions.

Do not stop after drafting a plan, creating a landing page, or building a few screens.

Continue until the application is as complete and functional as the environment and stated constraints allow.

At the end, report:

- What was actually implemented
- What was tested
- Which tests passed or failed
- Which integrations are functional
- Which features require external credentials or native iOS capabilities
- Any incomplete requirements
- The exact commands to run the application
- The process for installing it on an iPhone
- How the user can back up their workout data
- The steps needed for future App Store distribution

**The final objective is a beautiful, dependable, scientifically informed fitness application that is enjoyable to use every day, remains useful without AI, costs nothing in mandatory API fees, and can evolve into a native iOS product.**
