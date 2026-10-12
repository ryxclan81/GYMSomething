export interface HelpDescription {
  title: string;
  body: string;
}

/** User-facing meanings and behavior, independent of DOM or storage internals. */
export const helpTopics = {
  help: {
    title: "Help mode",
    body: "Tap a control to see what it does. While Help mode is on, taps explain controls instead of changing your workout or settings. Choose Exit Help when you are ready to use them.",
  },
  rir: {
    title: "Reps in reserve (RIR)",
    body: "Estimate how many more good repetitions you could have done when you stopped. RIR 2 means about two more reps; RIR 0 means none. It is your estimate of effort, not a measurement by the app.",
  },
  rpe: {
    title: "Effort rating (RPE)",
    body: "Rate how hard the set felt from 0 to 10. In lifting, 10 usually means no more good reps were possible; 8 often means about two reps remained. This is a subjective estimate.",
  },
  e1rm: {
    title: "Estimated one-rep maximum",
    body: "An estimate of the load you might lift once, calculated from an eligible set of 1–10 reps. It is not a tested maximum or an instruction to attempt that weight. Different exercises use their own recorded load convention.",
  },
  deload: {
    title: "Lighter week (deload)",
    body: "A planned week with less work or resistance. It can give you room to recover. Setwise applies the lighter targets to planned workout copies; it does not rewrite your completed sessions.",
  },
  muscleVolume: {
    title: "Muscle sets",
    body: "Counts working sets for each muscle. A primary muscle gets one direct set. A secondary muscle gets the fraction chosen in your profile. Warm-ups and skipped sets are excluded. These counts do not measure muscle growth.",
  },
  volumeLoad: {
    title: "External volume load",
    body: "Recorded external weight multiplied by repetitions, then added across sets. Two implements are counted when the exercise uses a paired per-hand load. Body mass, assisted resistance and timed work are excluded. Compare like exercises and load conventions.",
  },
  restPause: {
    title: "Rest-pause set",
    body: "A set with short breaks followed by more repetitions. This tag describes how you trained; Setwise does not automatically split the effort into several sets. Record reps and weight consistently.",
  },
  myoReps: {
    title: "Myo-reps",
    body: "A hard initial set followed by short rests and small groups of additional reps. The tag records your method; it does not automatically count each group as a separate set. Use a consistent logging convention.",
  },
  amrap: {
    title: "As many reps as possible (AMRAP)",
    body: "A set where you perform as many good reps as you planned to attempt. Stop when technique or your chosen effort limit requires it. The tag does not automatically change your targets.",
  },
  warmup: {
    title: "Warm-up set",
    body: "Preparatory work before your working sets. Setwise keeps the record but excludes warm-ups from working-set totals, personal records and progression checks.",
  },
  dropSet: {
    title: "Drop set",
    body: "You reduce resistance and continue the effort. Add separate entries when you want each weight and rep count recorded accurately. The tag itself does not create those entries.",
  },
  assistance: {
    title: "Assistance weight",
    body: "Resistance that helps you perform the movement, such as an assisted pull-up machine. More assistance usually makes the movement easier. Assistance is kept separate from external volume and estimated maximums.",
  },
  loadConvention: {
    title: "How to record weight",
    body: "Total load means the full external weight, such as a bar and plates. Per-hand means the weight of one implement. Added load is extra weight beyond your body mass. Machine numbers may differ between machines.",
  },
  doubleProgression: {
    title: "Double progression",
    body: "Build repetitions within the target range first. After the required sets and sessions meet the rule, Setwise can suggest a weight increase. You review the suggestion before future targets change.",
  },
  linearProgression: {
    title: "Linear progression",
    body: "Suggests a fixed weight increase after the configured success conditions are met. It does not promise a steady rate of strength gains. You can change or dismiss each suggestion.",
  },
  progression: {
    title: "Progression rules",
    body: "Rules for proposing the next target from completed working sets, effort and recovery spacing. Suggestions need your review and change future template targets only when accepted; they do not edit past workouts.",
  },
  increment: {
    title: "Weight increment",
    body: "The amount of weight added by a progression rule. Use a value that your plates, dumbbells or machine can actually provide. The amount follows the exercise's load convention.",
  },
  goalTimeline: {
    title: "Goal time estimate",
    body: "A planning calculation from a current weight to a target at your chosen weekly change, or within your chosen number of weeks. It assumes a steady rate and is not a prediction. A date you choose yourself stays fixed until you select Use estimated date.",
  },
  weeklyRate: {
    title: "Weekly weight change",
    body: "The positive amount of weight change assumed each week for this plan. The target determines whether that is a gain or loss. Editing it recalculates the planning weeks and estimated date, unless you chose your own deadline.",
  },
  planningWeeks: {
    title: "Planning weeks",
    body: "How long you want this weight plan to take. Editing weeks calculates the weekly weight change needed for the remaining difference. This is an assumption for planning; actual progress can vary.",
  },
  goalDeadline: {
    title: "Goal date",
    body: "An optional date to aim for. With a time estimate enabled, it follows the calculation until you pick your own date. Your chosen date stays fixed when you edit the target or rate.",
  },
  relativeStrength: {
    title: "Strength relative to bodyweight",
    body: "For a relative-strength goal, Setwise divides an eligible estimated one-rep maximum by your profile bodyweight. Lift-specific record tiers instead use the recorded load and editable comparison thresholds. These are different calculations, not clinical rankings.",
  },
  skill: {
    title: "Skill goal",
    body: "A milestone you score or log yourself, such as progress toward a pull-up or a hold. Setwise cannot judge technique from the score. Add notes to make your scoring consistent.",
  },
  localSaving: {
    title: "Saved on this device",
    body: "Your records stay in this browser's local storage on this device. There is no training account or server sync. Clearing site data can remove them. Export backups regularly; if saving fails, keep the page open and export the unsaved work.",
  },
  offline: {
    title: "Offline use",
    body: "After the app has loaded and its offline files are cached, you can log workouts and use local features without an internet connection. Online food search, remote images, configured AI and Spotify can need a connection.",
  },
  backup: {
    title: "Full backup",
    body: "Downloads a readable copy of your records, settings and exercise library. Store it somewhere you can find again. It is separate from your browser's saved copy and is useful if you move phones or clear site data.",
  },
  restore: {
    title: "Restore a backup",
    body: "Replaces the current device's records with the backup you select. Setwise validates the file before saving it, then asks for an explicit confirmation. Export your current records first if you want to keep them too.",
  },
  csv: {
    title: "Spreadsheet export",
    body: "Downloads selected records in a table that spreadsheet apps can read. CSV is useful for analysis but is not a full app backup and cannot restore every setting.",
  },
  nutrition: {
    title: "Nutrition tracking",
    body: "An optional food, water and macro diary. Turning it off keeps your records. Food labels and serving sizes can vary, so review imported values. Photo-based nutrition estimation is not available.",
  },
  calories: {
    title: "Calories",
    body: "Food energy, shown in dietary Calories (kilocalories). Diary totals depend on the food's serving size and how many servings you log. Your editable target is a planning value, not a measured calorie need.",
  },
  protein: {
    title: "Protein",
    body: "Grams of protein in a serving or daily total. Protein supports tissue repair and other body functions. Setwise totals what you log; the target is editable and is not an individual prescription.",
  },
  carbs: {
    title: "Carbohydrates",
    body: "Grams of carbohydrate in a serving or daily total. Carbohydrates can supply energy for training and everyday activity. Check serving sizes when comparing foods.",
  },
  fat: {
    title: "Fat",
    body: "Grams of dietary fat in a serving or daily total. The amount is taken from the food record you log. Serving size changes the total.",
  },
  fiber: {
    title: "Fiber",
    body: "Grams of dietary fiber in the food record, when available. Missing fiber data does not mean the food contains none. Review its label when you need a more complete record.",
  },
  serving: {
    title: "Serving size",
    body: "The portion used for the food's listed nutrition. Diary amounts multiply those values by your number of servings. For example, half a listed serving uses 0.5 servings.",
  },
  foodSearch: {
    title: "Find a food",
    body: "Search saved foods or the available online food service. Online results need a connection and may be incomplete. Check the source, portion and nutrition values before adding a result to your diary.",
  },
  barcode: {
    title: "Barcode lookup",
    body: "Finds a food using the number on its package. Camera scanning depends on device permission and browser support; you can type the number instead. A matching barcode does not guarantee complete or correct nutrition values.",
  },
  qr: {
    title: "QR code",
    body: "A supported QR code can supply a product number or food-service product link. Arbitrary QR content and food photos cannot be turned into nutrition values. Use manual entry when a code is unsupported.",
  },
  water: {
    title: "Water diary",
    body: "Records the amount of water you add for the selected day. The target is an editable reminder amount; it is not a measured fluid requirement.",
  },
  ai: {
    title: "Optional AI assistant",
    body: "Uses the secure endpoint configured in Settings. It is unavailable until one is configured. Only the summaries you consent to share are sent. Review its advice before making training or nutrition changes.",
  },
  aiConsent: {
    title: "Sharing with the AI assistant",
    body: "Choose which summary the configured assistant may receive. Training, profile and nutrition permissions are separate. Turning a permission off prevents that summary from being included in future requests.",
  },
  aiEndpoint: {
    title: "Secure AI endpoint",
    body: "The HTTPS address of your own configured assistant service. Shared provider keys should stay on its server, not in this app. Without a working endpoint, you can keep using the app's local training tools.",
  },
  voice: {
    title: "Voice commands",
    body: "Uses speech recognition supported by your browser or device. Permissions and availability vary, and speech may use a device provider's service. Review interpreted commands; typed controls remain available.",
  },
  spotify: {
    title: "Spotify controls",
    body: "An optional connection using your configured Spotify app. Remote playback can require Premium, an active playback device and an allowed account. Setwise is not a music player and does not store your Spotify password.",
  },
  reminders: {
    title: "Training reminders",
    body: "Set a reminder time and training days. In-app reminders require the app to be active; background delivery is not guaranteed. You can also export calendar reminders to your calendar app.",
  },
  quietHours: {
    title: "Quiet hours",
    body: "The time window when in-app reminders should stay quiet. A window can run overnight, such as 22:00 to 07:00. Your phone and calendar may have separate notification settings.",
  },
  equipment: {
    title: "Equipment environment",
    body: "Lists what you can use at a particular gym or at home. It helps check a planned exercise and offer substitutes. Pick the environment where you will actually train.",
  },
  maxDumbbell: {
    title: "Maximum dumbbell weight",
    body: "The heaviest single dumbbell available in this environment. Enter the weight of each dumbbell, not the sum of a pair. This helps check whether planned resistance is available.",
  },
  substitution: {
    title: "Exercise substitution",
    body: "Chooses another movement for the current exercise using available equipment and similar training targets. It does not guarantee an identical stimulus. Check the new movement and enter suitable resistance.",
  },
  superset: {
    title: "Superset group",
    body: "Exercises with the same group name are intended to be performed together in your chosen sequence. The label organizes the plan; it does not automatically complete sets or measure rest between movements.",
  },
  rest: {
    title: "Rest timer",
    body: "Time between efforts. You can adjust, pause or skip it to match your session. The timer cannot guarantee an alert while the app is closed or your phone has suspended it.",
  },
  timedExercise: {
    title: "Exercise timer",
    body: "Measures how long you hold or perform this set. Countdown shows time left to your target; Stopwatch counts upward. Pause excludes that break, and Reset clears only the timer. Finish set records the measured duration. Reaching the target does not mark the set complete, and alerts may be unavailable in the background.",
  },
  workoutIcon: {
    title: "Workout icon",
    body: "Choose a symbol that helps you recognize this saved workout. The icon is a visual reminder; actual muscle targets come from its exercises. Save the workout to keep your choice.",
  },
  workoutSort: {
    title: "Workout order",
    body: "Recently saved puts new and edited workouts first. You can also arrange them by name, training focus or estimated duration. Sorting changes this list's order without changing a workout or its calendar dates.",
  },
  bodyweight: {
    title: "Bodyweight measurement",
    body: "Your recorded body mass, stored separately from exercise resistance. The latest dated measurement can update bodyweight goals; the profile value is used when no measurement is available.",
  },
  height: {
    title: "Height",
    body: "An optional profile measurement. You can enter centimetres or feet and inches. Switching units converts the same height rather than changing it. It does not automatically prescribe training or nutrition.",
  },
  appearance: {
    title: "Appearance",
    body: "Changes the accent color or spacing of this app on your device. It affects how screens look, not your training targets or recorded values.",
  },
  milestones: {
    title: "Consistency and milestones",
    body: "Optional markers based on your saved training records. They can highlight consistency and personal milestones. Turning them off keeps the underlying workouts and goals.",
  },
  schedule: {
    title: "Workout schedule",
    body: "Places planned workouts on selected dates. A planned workout is not a completed session. Starting it creates a separate record; finishing and saving it records what you actually did.",
  },
  programPhases: {
    title: "Program phases",
    body: "Named week ranges within a training block, each with optional rep ranges and set or weight adjustments. Applying the block creates planned target copies. Editing a phase does not rewrite completed workouts.",
  },
  template: {
    title: "Workout template",
    body: "A reusable plan containing exercises and targets. Starting it creates a session copy so you can record actual work. Editing the template affects future sessions, not completed records.",
  },
  planPreset: {
    title: "Training preset",
    body: "A starting arrangement of workouts for a training focus. Review its exercises, equipment, days and dates before applying it. You can edit the resulting plan to suit your routine.",
  },
  privacy: {
    title: "Privacy and device storage",
    body: "Your training records stay on this device. Optional online features contact their configured services when used. There is no automatic account backup; export a copy before moving devices or clearing site data.",
  },
  units: {
    title: "Measurement units",
    body: "Kilograms (kg) and pounds (lb) are two ways to express weight. One kilogram is about 2.2 pounds. Your profile preference changes weight displays; individual goals have their own units. Always check the unit next to a value before editing it.",
  },
  experience: {
    title: "Training experience",
    body: "Choose the level that best matches your familiarity with training. Beginner is a useful starting point while learning movements and routines. This preference helps select starting plans; it is not a test of fitness or a ranking.",
  },
  focus: {
    title: "Training focus",
    body: "Choose what you most want your training to support. Hypertrophy means building muscle; strength focuses on lifting ability; endurance on sustaining repeated effort; cardio on aerobic activity; calisthenics on bodyweight skills. Hybrid combines priorities.",
  },
  split: {
    title: "Workout split",
    body: "How your training is divided across days. Full body trains several muscle groups in each session. Upper/lower alternates upper- and lower-body sessions. Push/pull/legs groups pressing, pulling and leg movements. Choose an arrangement that fits your available days.",
  },
  effort: {
    title: "Effort tracking",
    body: "Choose how you record how hard a set felt. RIR estimates the good reps you had left; RPE rates effort from 0 to 10. You can show either, both or neither. These are your estimates, not measurements by the app.",
  },
  repetitions: {
    title: "Repetitions",
    body: "One repetition is one complete movement. Enter the number you performed for an actual set, or the minimum and maximum you aim for in a template. A target is separate from what you log as completed work.",
  },
  sets: {
    title: "Working sets",
    body: "A set is a group of repetitions or one timed effort before a rest. Working sets are the main training work. A template's set count creates starting entries; only completed eligible sets count toward recorded totals.",
  },
  muscles: {
    title: "Muscle selection",
    body: "Primary muscles do the main work in a movement; secondary muscles assist. In the library, choosing a muscle filters movements. In an exercise editor, muscle labels describe the movement's targets and affect muscle-set summaries.",
  },
  programLength: {
    title: "Program length",
    body: "The number of weeks in this training block. Applying it places workout copies on the selected training days from the start date. Review the calendar preview before applying, especially if you already have planned workouts.",
  },
  sessionLength: {
    title: "Session duration preference",
    body: "How many minutes you usually have for training. It helps describe or choose starting workouts; it is not a timer that ends your session or a guarantee that every workout will fit.",
  },
  dateRange: {
    title: "Date range",
    body: "Limits these totals or records to saved sessions within the selected dates. Choosing another range changes the view, not your saved history. A custom range lets you choose both dates.",
  },
  limitations: {
    title: "Training limitations",
    body: "Notes about constraints you want to consider when choosing movements. You can also list exercises to avoid. These preferences are not a medical assessment; check each movement and its safety notes before training.",
  },
  photos: {
    title: "Exercise image or video",
    body: "An optional visual reference for the movement. Custom media is saved on this device and can use significant storage. A picture is a reference, not feedback on your own technique.",
  },
  setType: {
    title: "Set type",
    body: "Describes how you performed the set. Working sets are main work; warm-ups prepare you and are excluded from training totals. Other tags include timed work, drop sets, rest-pause and myo-reps. A tag does not automatically split an effort into multiple recorded sets.",
  },
} satisfies Record<string, HelpDescription>;

export type HelpTopic = keyof typeof helpTopics;
export type HelpControlKind =
  | "button"
  | "number"
  | "text"
  | "date"
  | "time"
  | "choice"
  | "toggle"
  | "link"
  | "option"
  | "disclosure"
  | "term"
  | "file";
export interface HelpControl {
  label: string;
  context?: string;
  kind: HelpControlKind;
  topic?: string;
  description?: string;
  disabled?: boolean;
}

const topicRules: [RegExp, HelpTopic][] = [
  [/set \d+ timer|^countdown$|^stopwatch$|timer mode/i, "timedExercise"],
  [/workout icon|^use .+ icon$/i, "workoutIcon"],
  [/sort workouts/i, "workoutSort"],
  [/\brir\b|reps? in reserve/i, "rir"],
  [/\brpe\b|effort rating/i, "rpe"],
  [/e[ -]?1rm|estimated (?:one.rep|1rm|strength)|one.rep max/i, "e1rm"],
  [/rest[ -]?pause/i, "restPause"],
  [/myo[ -]?reps?/i, "myoReps"],
  [/\bamrap\b|as many reps/i, "amrap"],
  [/warm[ -]?up/i, "warmup"],
  [/drop set/i, "dropSet"],
  [/deload|lighter week/i, "deload"],
  [/indirect|direct sets|muscle sets|muscle distribution/i, "muscleVolume"],
  [/volume load|external volume/i, "volumeLoad"],
  [/restor|paste backup|choose.*json|type restore/i, "restore"],
  [/csv|spreadsheet/i, "csv"],
  [/backup|recovery export/i, "backup"],
  [/saved on|saving|local storage|unsaved|save.*device/i, "localSaving"],
  [/offline/i, "offline"],
  [/weekly weight change/i, "weeklyRate"],
  [/planning weeks/i, "planningWeeks"],
  [/deadline|estimated date|target date/i, "goalDeadline"],
  [/time estimate|current weight for estimate|plan from date/i, "goalTimeline"],
  [
    /relative strength|strength.*bodyweight|strength thresholds|comparison threshold/i,
    "relativeStrength",
  ],
  [/superset|group label/i, "superset"],
  [/load convention/i, "loadConvention"],
  [/assist(?:ance|ed)/i, "assistance"],
  [/double progression/i, "doubleProgression"],
  [/linear progression/i, "linearProgression"],
  [/increment/i, "increment"],
  [
    /progression|successful sets|plateau|min(?:imum)? days|review interval/i,
    "progression",
  ],
  [/maximum dumbbell/i, "maxDumbbell"],
  [/substitut|replace.*exercise|swap.*exercise/i, "substitution"],
  [/share.*(?:summary|preferences)|consent/i, "aiConsent"],
  [/secure ai endpoint|ai endpoint/i, "aiEndpoint"],
  [/\bai\b|ask your coach/i, "ai"],
  [/voice|speech|microphone/i, "voice"],
  [/spotify|music controls|playback/i, "spotify"],
  [/quiet hours/i, "quietHours"],
  [/reminder|calendar export|\.ics/i, "reminders"],
  [/qr code|scan qr/i, "qr"],
  [/barcode|scan code/i, "barcode"],
  [/search food|find food|food search/i, "foodSearch"],
  [/calories|energy target/i, "calories"],
  [/protein/i, "protein"],
  [/carbs?|carbohydrate/i, "carbs"],
  [/\bfat\b/i, "fat"],
  [/fiber|fibre/i, "fiber"],
  [/serving|portion/i, "serving"],
  [/water|hydration/i, "water"],
  [/nutrition|macro/i, "nutrition"],
  [/bodyweight|body weight/i, "bodyweight"],
  [/height|centimet|feet.*inch/i, "height"],
  [/appearance|accent colo|spacing|density/i, "appearance"],
  [/consistency|celebration|gamification|milestone/i, "milestones"],
  [/phase|week range|set multiplier|load multiplier/i, "programPhases"],
  [/preset|starter program/i, "planPreset"],
  [/equipment|environment|bench can incline/i, "equipment"],
  [/schedule|training days|preferred days/i, "schedule"],
  [/template/i, "template"],
  [/privacy/i, "privacy"],
  [/rest timer|default rest|rest seconds|pause rest|skip rest/i, "rest"],
  [/skill/i, "skill"],
  [
    /measurement units|^units?$|kilograms?|pounds?|\bkg\b.*\blb\b|^(?:kg|lb|cm|ft|in)$/i,
    "units",
  ],
  [/experience|beginner|intermediate|advanced/i, "experience"],
  [
    /training focus|primary focus|secondary goals|hypertrophy|calisthenics|general fitness|^hybrid$|^strength$|^endurance$|^cardio$/i,
    "focus",
  ],
  [/split|full body|upper.*lower|push.*pull.*legs/i, "split"],
  [/effort tracking|^effort$/i, "effort"],
  [/repetitions|rep(?:etition)? range|\breps?\b/i, "repetitions"],
  [/^sets?$|working sets|set count/i, "sets"],
  [
    /primary muscles|secondary muscles|^chest$|^back$|^shoulders$|^biceps$|^triceps$|^quadriceps$|^hamstrings$|^glutes$|^calves$|^abdominals$/i,
    "muscles",
  ],
  [/program length|block length|^weeks$/i, "programLength"],
  [/session minutes|session duration|workout minutes/i, "sessionLength"],
  [/date range|analytics.*range|record.*range/i, "dateRange"],
  [/limitations|exercises to avoid|movements to avoid/i, "limitations"],
  [/photo|image|video|exercise media/i, "photos"],
  [/^strategy$/i, "progression"],
  [/set type|custom type/i, "setType"],
];

function actionDescription(label: string): string | undefined {
  if (/^setwise home$/i.test(label))
    return "Returns to Home so you can see the selected day's workouts and your saved training summary.";
  if (/^get started$/i.test(label))
    return "Opens optional setup. You can share your training preferences or use defaults, then edit them later in Settings.";
  if (/^(?:start|pause|resume|reset|finish).+set \d+ timer$/i.test(label))
    return /^finish/i.test(label)
      ? "Completes this set with the duration the timer actually measured. You can undo the completed set to correct it."
      : /^reset/i.test(label)
        ? "Clears the measured time for this set without deleting its entered values or marking it complete."
        : /^pause/i.test(label)
          ? "Pauses measuring this set. Time spent paused is not included when you resume."
          : /^resume/i.test(label)
            ? "Continues measuring from the saved elapsed time, excluding time spent paused."
            : "Starts measuring this set using the selected countdown or stopwatch mode. Finish set saves your actual duration.";
  if (/^search open food facts$/i.test(label))
    return "Sends this search to Open Food Facts for branded products. Your saved collection and USDA generic foods filter locally without needing this action.";
  if (/^skip this exercise/i.test(label))
    return "Leaves this movement in the workout as skipped. Its sets are not counted as completed work; the other exercises remain available.";
  if (/^(?:complete|undo).+set\b/i.test(label))
    return /^undo/i.test(label)
      ? "Marks this set as unfinished again. You can correct its entries and complete it later."
      : "Marks this set as done using the values you entered. It becomes part of the session record; you can undo it to make a correction.";
  if (/finish workout|save workout/i.test(label))
    return "Review and save what you actually completed. Unfinished sets remain distinguishable from completed work; the session becomes available in your history.";
  if (/^start\b/i.test(label))
    return "Begins a session you can log on this device. Planned targets are copied into it so you can record actual weights, reps and time without changing the original plan.";
  if (/resume|continue workout/i.test(label))
    return "Returns to your unfinished workout with its saved entries and focused exercise. You can keep logging or finish the session.";
  if (/save correction/i.test(label))
    return "Saves edits to this session's actual entries. Its recorded totals can change; your original workout template remains separate.";
  if (/^save\b|^apply changes/i.test(label))
    return "Saves the current entries on this device. Wait for the saved status before closing the page. If saving fails, keep it open and export a backup of your unsaved work.";
  if (/^(?:delete|remove|reset)\b/i.test(label))
    return "Removes or resets the item named here. Check which records the action affects and read any confirmation before continuing. This can change what remains in your saved data.";
  if (/^(?:edit|customize|adjust)\b/i.test(label))
    return "Opens the relevant editor so you can review and change its values. Follow the editor's save action to keep your changes.";
  if (/^duplicate|^copy\b/i.test(label))
    return "Creates another copy you can edit separately. The original stays available.";
  if (/^add\b|^create\b|^new\b/i.test(label))
    return "Adds an item or opens its editor. Review the new item's values before saving or using it in a workout.";
  if (/^next\b|^continue\b/i.test(label))
    return "Moves to the next exercise or step. Completing a step does not automatically mark unlogged workout sets as done.";
  if (/^back\b|^previous\b|all exercises/i.test(label))
    return "Returns to the previous view or the exercise overview so you can choose what to work on next.";
  if (/^close\b|^cancel\b/i.test(label))
    return "Closes this view. Changes that require a Save action should be saved first if you want to keep them.";
  if (/accept/i.test(label))
    return "Applies this proposed change to future training targets. Review the exercise and amount first; previous workout records are preserved.";
  if (/dismiss|snooze/i.test(label))
    return "Leaves this suggested change unapplied. Snoozing hides it until later; dismissing records your decision to leave it aside.";
  if (/^search\b|^filter\b/i.test(label))
    return "Narrows the visible list to matching entries. It does not remove records from your saved data.";
  if (/view plan|view calendar|calendar/i.test(label))
    return "Opens your planned training dates so you can review, move or start scheduled workouts. Planned entries are separate from completed session history.";
  if (/exercise library/i.test(label))
    return "Browse movement instructions, equipment requirements and muscle targets. You can search, filter, save favorites or create an exercise with your own details.";
  if (/workout library/i.test(label))
    return "Browse reusable workout templates. Review a template's exercises and targets, then start it or edit a copy to match your needs.";
  if (/^today$/i.test(label))
    return "Returns the calendar or selected day to today's local date. It changes which day you are viewing; it does not move a planned workout.";
  if (/use defaults/i.test(label))
    return "Uses the app's starting preferences so you can finish setup quickly. You can change them later in Settings and choose or edit a training plan.";
  if (/skip for now/i.test(label))
    return "Leaves this optional setup choice for later and continues to the next step. You can revisit your preferences after setup.";
  if (/let[’']?s get started|get started/i.test(label))
    return "Saves your setup choices on this device and opens the app. If you selected a starter plan, review the resulting workouts and calendar before training.";
  if (
    /^home$|^train$|^plan$|^progress$|^history$|^records$|^goals$|^overview$|^settings$/i.test(
      label,
    )
  )
    return {
      home: "Shows today's plan, an unfinished workout and a summary of your saved training.",
      train: "Choose a workout template, start a session or browse exercises.",
      plan: "Arrange reusable workouts into programs and scheduled training days.",
      progress:
        "Explore saved workouts, goals, personal records and training totals.",
      history:
        "Review completed sessions and open one to inspect or correct its entries.",
      records: "Shows eligible personal bests in your selected date range.",
      goals:
        "Create and review milestones tracked from your workouts, measurements or manual entries.",
      overview:
        "Shows a summary of the records and settings relevant to this screen.",
      settings:
        "Change your preferences, equipment, optional features and backup settings.",
    }[label.toLowerCase()];
  return undefined;
}

/** Resolve explicit topic/body first, then meaning, then the control's behavior. */
export function describeHelpControl(control: HelpControl): HelpDescription {
  const label = control.label.trim().replace(/\s+/g, " ") || "This control";
  let result: HelpDescription | undefined;
  if (control.description) result = { title: label, body: control.description };
  else if (control.topic && Object.hasOwn(helpTopics, control.topic))
    result = helpTopics[control.topic as HelpTopic];
  else {
    // Labels outrank screen context: a RIR field in Nutrition still means RIR.
    const rule = topicRules.find(([pattern]) => pattern.test(label));
    const action = ["button", "link", "text"].includes(control.kind)
      ? actionDescription(label)
      : undefined;
    if (action)
      result = {
        title: label,
        body: rule ? `${action}\n\n${helpTopics[rule[1]].body}` : action,
      };
    else if (rule) result = helpTopics[rule[1]];
    if (
      !result &&
      /goal/i.test(control.context ?? "") &&
      /target|starting|current/i.test(label)
    )
      result = {
        title: label,
        body: /starting/i.test(label)
          ? "Your baseline when the goal began. Progress is measured from this value toward the target. A timeline's planning current weight is separate and can be updated."
          : /target/i.test(label)
            ? "The value you want to reach, in this goal's chosen unit. A lower target works for goals such as bodyweight loss or faster pace."
            : "The latest value used to track this goal. Automatic goals use saved workouts or measurements; skill and custom goals use the value you log.",
      };
    if (!result) {
      const body: Record<HelpControlKind, string> = {
        number:
          "Enter a number in the unit shown beside this field. You can clear it before replacing the value. The field's minimum, maximum and required status determine what can be saved.",
        text: "Enter or edit the information requested by this label. Required fields must be filled before the form can be saved.",
        date: "Choose a calendar date for this item. Use the date picker or enter a date directly; check the year as well as the month and day.",
        time: "Choose a local clock time for this setting. Check the hours and minutes before saving.",
        choice:
          "Open the list and choose one option. You can also use the keyboard's arrow keys and Enter. The selected option controls the value shown here.",
        toggle:
          "Turns this setting on or off. Its current checked state shows whether it is enabled; read the nearby description for what it affects.",
        link: "Opens the linked page or resource. External services may require an internet connection and have their own privacy settings.",
        option:
          "Selects this option in the open list. Read the option name and its units before confirming your choice.",
        disclosure:
          "Expands or collapses additional details without changing your recorded values.",
        term: "This label describes the nearby setting or result. Look at its units and surrounding explanation to understand the value.",
        file: "Choose a file from your device. The app checks supported formats before using it; selecting a backup does not complete a restore until you confirm.",
        button:
          "Opens or performs the action named by this control. While Help mode is active, you can inspect it without running the action.",
      };
      result = { title: label, body: body[control.kind] };
    }
  }
  return control.disabled
    ? {
        ...result,
        body: `${result.body} This control is currently unavailable; check the nearby guidance or required fields.`,
      }
    : result;
}
