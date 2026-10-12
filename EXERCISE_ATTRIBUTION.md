# Exercise content, selection and licensing

The offline library contains **728 distinct exercises** selected from the 876-record [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), maintained by **yuhonas**, based on the original dataset by **Ollie Jennings**. No workout history or user performance statistics are bundled.

## Snapshot

- Source repository revision: `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`.
- Download: [`dist/exercises.json`](https://raw.githubusercontent.com/yuhonas/free-exercise-db/f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/dist/exercises.json).
- Download verified during implementation on October 10, 2026.
- Source file SHA-256: `5BB747E3FC658F095A60DCBF6D53C96627ACDCC6FFB6FFFDE86F7E26995D40BF`.
- Actual application content: `src/data/exercises.ts`; instructions are bundled and work offline.

The repository publishes its dataset under the [Unlicense](https://github.com/yuhonas/free-exercise-db/blob/f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/LICENSE.md), a public-domain dedication with a permissive fallback. We retain voluntary attribution in each exercise and this document. Source exercise links point to the pinned revision so provenance remains inspectable. No proprietary fitness API or scraped video content is included.

## What was preserved and changed

Source names, primary/secondary muscles, difficulty classifications and step-by-step instructions were retained. Identifiers were normalized to stable `ex-` slugs. Muscle display names were standardized (for example abdominals → Core and quadriceps → Quads). Descriptions use the first source instruction sentence rather than invented descriptions. Common aliases were added for selected familiar movements.

Source equipment has only one field and is incomplete in some records. Required benches, incline capability, barbell plates, rack supports, pull-up bars, bands and other essential equipment were conservatively inferred from the supplied name/instructions. Specific machine labels distinguish a leg press, leg curl, chest press, bike, treadmill and other machines. Unknown specialty equipment is excluded instead of assumed available.

We excluded 148 records with unknown equipment that could not be resolved conservatively, missing usable descriptions/muscles, partner-dependent instructions, and a selected set of neck-loaded/behind-neck/guillotine-style techniques. This is a selection rule for a general-purpose library, not a medical judgment or a claim that every included exercise is suitable for every user. Advanced Olympic lifting and plyometrics remain identified as technical categories and should be approached with appropriate instruction.

Movement-pattern labels and alternatives are application metadata inferred for discovery. Alternatives share pattern/muscles; their load values and histories are never treated as equivalent. General mistakes and safety cues were added by Setwise and are intentionally conservative. They are not presented as unique peer-reviewed instructions for every source variation. Source content and equipment inference have not received a complete professional exercise-by-exercise audit. Users can create or edit their own exercises; use personal limitations and choose manageable movements.

## Resistance and side conventions

Dumbbell loads are stored per hand. A `two-implements` tag is used only when the supplied instructions describe simultaneous paired implements; external volume then counts both. One-arm, alternating and other unilateral entries include a note to log each side as a separate set. Added bodyweight load, assistance, unweighted bodyweight, timed mobility/holds and cardio remain separate measurement conventions. Band exercises without a reliable numeric resistance convention are bodyweight/no-load entries.

All mobility entries initially use duration measurement. Users can create a repetitions-based custom variant for dynamic mobility when desired. Remote source data is never fetched to replace stored workout exercise snapshots.

## Demonstration images

Each exercise may contain an optional `media` URL for the source repository's first demonstration photograph at the same pinned revision. The source README explicitly documents reuse of its text and images; the repository license is the Unlicense. The app does not bundle or download the entire image archive. Images require internet on first access, availability depends on GitHub hosting, and a missing image does not prevent viewing instructions or logging workouts. The exercise source links remain available for attribution and source review.

Media requests disclose ordinary connection metadata to GitHub when an exercise detail displaying an image is opened. No personal workout or profile data is included in those requests. Images are educational demonstrations, not a substitute for individual coaching.

## Upstream license text

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <https://unlicense.org>.
