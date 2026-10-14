const programHelp =
  "A program organizes saved workouts into a repeating order. Schedule length is optional; it controls the calendar preview when you apply the program. Saving edits does not rewrite completed sessions.";
const workoutHelp =
  "Name the workout, choose its icon and add movements. Sets and reps uses normal set targets; Timed circuit repeats per-round targets for a chosen time limit. Drag the handles or use their move controls to change order, then save the workout.";
const descriptions: Record<string, string> = {
  "Welcome to Setwise":
    "Setup is optional. Continue through the choices you want to personalize, or use defaults. Presets are added only if you choose them; your completed history starts empty.",
  Settings:
    "Edit your training preferences, equipment inventories and optional tools here. Backup & data exports or restores your records. Changes stay on this device.",
  "Where are you training?":
    "Select the equipment inventory available today. Manage equipment opens your saved environments so you can edit or create one. Each session checks its movements against that inventory.",
  Appearance:
    "Choose an accent color and comfortable or compact spacing. Each choice saves immediately on this device. These settings change the display, not your workout records.",
  "Training profile":
    "Set units, focus, experience, preferred days and optional measurements. Progression and effort controls personalize future targets and fields; recorded sessions stay unchanged. Save profile keeps your edits.",
  "Create workout": workoutHelp,
  "Edit workout": workoutHelp,
  "New program": programHelp,
  "Edit program": programHelp,
  "Matching starter presets":
    "This small selection matches your saved preferences and current equipment. Review the movements before adding. Adding presets creates editable workouts and one program; it does not record completed training or overwrite your existing library.",
  "Equipment environments":
    "Choose the inventory you are training with today. Edit changes its available equipment; it does not rewrite recorded workouts. You can keep separate gym, home and travel inventories.",
  "Edit environment":
    "Search the equipment list and select what is available. Select all shown adds the filtered equipment. No equipment is an exclusive bodyweight-only choice. Save environment keeps your edits.",
  "Make this workout yours":
    "Pick an equipment-compatible substitute for each unavailable movement, or skip it for this session. Substitutes have separate exercise histories. The saved workout template stays unchanged.",
  "Workout logging":
    "Choose an exercise, enter what you actually did and complete each set. After its last set, you return to the overview to choose your next movement. Save workout keeps the session in history.",
  "Timed circuit":
    "Repeat the listed movements until your chosen time limit. Record a completed round or individual movements using the reps you actually did. Pausing stops the clock; reaching the time limit never records work automatically. Unfinished movements can be kept as a partial round.",
  "Find food":
    "Your saved foods and the generic food library work offline. Search Open Food Facts or enter a barcode for packaged products. Missing products can be saved from their label; confirm the portion and nutrients before logging.",
  "Scan product barcode":
    "Allow camera access and hold a product barcode steady in view, or enter its digits manually. Lookup uses Open Food Facts and saved foods. If a product is missing, you can enter the nutrition label yourself.",
  "Log food":
    "Choose the portion or grams you ate and the meal/date where it belongs. Nutrients scale from the food's reference serving. Confirm the values before saving the diary entry.",
  "Edit diary entry":
    "Change this recorded food's amount, meal, date or note. Save updates this diary entry; the original food record and other diary entries stay unchanged.",
  "Recipes & saved meals":
    "Recipes combine ingredients into a reusable food with a chosen yield. Saved meals reuse a group of diary foods. Logging either still asks you to confirm the amount you ate.",
  "Recipe editor":
    "Add ingredients and their amounts, then set how many portions the recipe makes. Nutrients are totaled and divided by that yield. Save creates or updates the reusable recipe.",
  "Personal nutrition targets":
    "Choose your own calorie, macro and water targets. They are comparison goals for the diary; the app does not calculate a personalized medical nutrition prescription. Save keeps the targets on this device.",
  "Set a goal":
    "Choose what you want to track and enter a baseline and target in its displayed unit. Weight-based goals can estimate weeks or a date from your editable rate. Estimates never log progress for you.",
  "Edit goal":
    "Change the target, timeline or notes for this goal. Recorded progress remains in its history. A manually chosen deadline stays fixed when the estimate changes.",
  "Log a measurement":
    "Record bodyweight for the chosen calendar date, with an optional note. The latest measurement updates your profile's bodyweight; earlier measurements stay available in history.",
  "Review recommendation":
    "Review the proposed future target and its reasons. You can adjust, accept or dismiss it. Accepting changes future workout targets while preserving active and completed sessions.",
  "Customize strength benchmark":
    "Set your own optional bodyweight-relative thresholds for this exercise. Labels are personal reference points; they are not an assessed or medically validated strength ranking.",
  "Add an exercise":
    "Search the exercise library and select a movement to add to this session. Its exercise identity and instructions stay separate from other movements. Your saved template does not change.",
  "Find a substitute":
    "Choose an equipment-compatible movement for this session, or skip the unavailable movement. Review its muscles, measurement and differences before confirming. The original saved template stays unchanged.",
  "Voice controls":
    "Voice input is push-to-talk and depends on browser support. Spoken commands are parsed into a reviewable proposal before recording. Typed commands and normal controls remain available.",
  "Workout voice commands":
    "Speak or type a logging command, review the parsed exercise, load and repetitions, and confirm before applying it. Voice input never completes a set without your confirmation.",
  "AI permissions & coach":
    "Use your configured secure endpoint only when you request coaching. Choose which context may be shared. The response can explain options but cannot change your workout records automatically.",
  Spotify:
    "Connect your Spotify developer configuration for supported playback controls, or open Spotify directly. API playback needs a supported account and active device. Disconnect removes the local connection.",
  "Reminders & calendar":
    "Choose in-app reminders and quiet hours, or export planned workouts as a calendar file. The web app cannot guarantee background alarms while closed.",
  "Backup & data":
    "Export a full JSON backup to transfer or restore your local records. CSV files are summaries for analysis. Import and full deletion have explicit confirmation; store your backups somewhere you can find them.",
  "Privacy & capabilities":
    "Core records stay in this browser or phone. Optional services receive data only through their specific features and permissions. Review the listed capabilities to see which native integrations are available.",
  "Workout icon library":
    "Choose a symbol you recognize for this workout. It does not change the exercise targets. Save the workout editor to keep the selected icon.",
  "Program editor":
    "A program organizes your saved workouts into a repeating plan. Schedule length is optional and is used when placing weeks on the calendar. Deleting a program preserves your recorded sessions.",
  "Delete workout":
    "Review the listed impact before deleting. Logged sessions and their exercise snapshots remain in history. Unsaved calendar plans and program references may change as shown here.",
  "Delete program":
    "This removes the reusable program. Your saved workout templates and recorded history remain available. Read the calendar impact before confirming.",
};

export function screenHelpDescription(title: string): string {
  return (
    descriptions[title] ??
    (/^Use /.test(title)
      ? "Review the program's dates, weekdays and calendar impact before applying it. Schedule length controls how many weeks are added. Existing recorded workouts and explicit rest days are protected."
      : /^Plan /.test(title)
        ? "Add a saved workout or mark this calendar date as a rest day. Calendar plans describe intended training; they never create completed sessions."
        : /technique/i.test(title)
          ? "Review this exercise's instructions, primary and secondary muscles, and source notes. Adapt technique to your own capabilities and equipment; this information does not change your recorded sets."
          : `Review ${title.toLowerCase()} here. Help icons beside individual fields explain their choices. Actions use the labels shown; read any confirmation before saving or deleting.`)
  );
}
