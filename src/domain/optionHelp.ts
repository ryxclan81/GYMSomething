const meanings: Record<string, string> = {
  hypertrophy:
    "Choose muscle-building workouts and starting rep ranges. Exercises and targets remain editable.",
  strength:
    "Choose strength-oriented starting workouts. You still choose and record your actual loads and reps.",
  endurance:
    "Choose workouts with longer repeated efforts. This does not automatically change a logged set.",
  cardio:
    "Choose time- or distance-based conditioning workouts. Record actual duration and distance yourself.",
  calisthenics:
    "Choose bodyweight-oriented workouts matched to your available equipment and skill level.",
  "general fitness":
    "Choose a balanced starting mix of strength and conditioning movements.",
  hybrid: "Choose a starting mix of resistance training and conditioning.",
  beginner:
    "Suggest simpler starting movements and targets. You can edit each workout as you learn.",
  intermediate:
    "Allow a broader mix of movements in matching presets. Your equipment requirements still apply.",
  advanced:
    "Allow advanced movement choices in matching presets. This is your preference, not an app-assessed skill level.",
  kg: "Display weight in kilograms. Saved resistance stays in its canonical unit, so switching display does not change recorded work.",
  lb: "Display weight in pounds. Switching the display converts the same recorded resistance.",
  rir: "Show reps in reserve: your estimate of how many more good reps you could have done.",
  rpe: "Show a 0–10 effort rating for each set, entered by you.",
  both: "Show both reps in reserve and the effort rating so you can record either or both.",
  none: "Hide the optional effort inputs; your weights, reps and completed sets remain available.",
  working:
    "Record a normal working set. Completed working sets contribute to training totals.",
  "warm-up":
    "Record preparatory work. Warm-up sets remain in history but are excluded from working-set totals and progression.",
  warmup:
    "Record preparatory work. Warm-ups are excluded from working-set totals and progression.",
  timed:
    "Record duration for this set. The timer measures actual time; reaching its target does not complete the set.",
  amrap:
    "Tag a set performed for as many repetitions as you chose to attempt. Reps still need to be logged.",
  recent:
    "Put newly saved and edited workouts first. Calendar dates and workout contents stay unchanged.",
  name: "Sort workout names alphabetically from A to Z.",
  focus: "Group the workout list by its training focus, then by name.",
  duration: "Put workouts with the shortest estimated time first.",
  auto: "Read a standard EAN, UPC or GTIN barcode and recognize equivalent zero padding.",
  upc_e:
    "Expand an eight-digit compressed UPC-E into its full UPC before product lookup.",
  manual:
    "Keep progression changes under your control instead of automatically proposing a load increase.",
  double:
    "Build reps within the chosen range first; a successful upper-range result can prompt a load increase.",
  linear:
    "Use your configured load increment when the saved performance and progression gates qualify.",
};
const progression: Record<string, string> = {
  double: meanings.double,
  linear: meanings.linear,
  manual: meanings.manual,
  reps: "Build repetitions while keeping the configured load. A saved qualifying result can prompt a rep target change.",
  volume:
    "Review completed working-set counts before changing future set targets. Extra sets are never recorded automatically.",
  rir: "Use your logged reps in reserve with the configured success gates when reviewing future load targets.",
  rpe: "Use your logged effort ratings with the configured success gates when reviewing future load targets.",
  percentage:
    "Use the configured percentage of an eligible estimated one-rep maximum as a future target. The estimate comes from comparable recorded resistance sets.",
  review:
    "Request a periodic target review rather than automatically increasing resistance.",
  skill:
    "Review bodyweight skill progress with your notes and recorded attempts. The app does not assess technique or automatically change the movement.",
  duration:
    "Review recorded duration before proposing a longer future time target. This does not change the workout timer or sort order.",
  distance:
    "Review recorded distance before proposing a longer future distance target. Actual distance stays manually logged.",
};

/** Unknown dynamic choices stay self-describing instead of inheriting the whole field's help. */
export function selectOptionHelp(
  label: string,
  value: string,
  field = "",
): string | undefined {
  const normalized = label.trim().toLowerCase();
  if (/sort workouts/i.test(field)) return meanings[value];
  if (/effort/i.test(field)) return meanings[value] ?? meanings[normalized];
  if (/strategy|progression/i.test(field)) return progression[value];
  if (/lighter week/i.test(field))
    return value === ""
      ? "Do not add a planned lighter week. Other calendar targets stay as configured."
      : /^\d+$/.test(value)
        ? `Use week ${value} for the program's planned lighter targets. Review the reduced sets and loads before applying the calendar.`
        : undefined;
  if (/barcode format/i.test(field)) return meanings[value];
  if (/unit/i.test(field)) return meanings[value] ?? meanings[normalized];
  if (
    [
      "none",
      "both",
      "duration",
      "recent",
      "name",
      "focus",
      "auto",
      "upc_e",
      "manual",
      "double",
      "linear",
    ].includes(normalized)
  )
    return undefined;
  return meanings[normalized];
}
