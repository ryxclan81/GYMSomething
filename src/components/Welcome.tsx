import {
  ArrowRight,
  Dumbbell,
  ChartNoAxesCombined,
  Utensils,
  Check,
} from "lucide-react";
import { Brand } from "./Brand";
import { Button } from "./ui";

export default function Welcome({
  onStart,
  busy,
}: {
  onStart: () => void;
  busy: boolean;
}) {
  return (
    <main className="welcome-page">
      <header className="welcome-header">
        <Brand />
      </header>
      <div className="welcome-layout">
        <section className="welcome-copy">
          <h1>
            Make your next
            <br />
            set count.
          </h1>
          <p>
            Your workouts, progress and nutrition. A little structure for the
            way you train.
          </p>
          <Button onClick={onStart} disabled={busy} className="welcome-start">
            {busy ? "Getting ready…" : "Get started"}
            <ArrowRight size={19} aria-hidden="true" />
          </Button>
          <small>Setup is optional. Your records stay on your device.</small>
        </section>
        <section
          className="welcome-preview"
          aria-label="What you can do with Setwise"
        >
          <div className="welcome-preview-heading">
            <Dumbbell size={24} aria-hidden="true" />
            <span>A plan that fits you</span>
          </div>
          <p>Choose your movements. Log one set at a time.</p>
          <div className="welcome-set-preview" aria-label="Example set log">
            <span>Set</span>
            <span>Reps</span>
            <span>Done</span>
            <strong>1</strong>
            <strong>10</strong>
            <Check size={18} aria-hidden="true" />
            <strong>2</strong>
            <strong>8</strong>
            <span className="welcome-next-set">Next</span>
          </div>
          <div className="welcome-preview-feature">
            <ChartNoAxesCombined size={19} aria-hidden="true" />
            <span>See your progress over time</span>
          </div>
          <div className="welcome-preview-feature">
            <Utensils size={19} aria-hidden="true" />
            <span>Keep food and training together</span>
          </div>
        </section>
      </div>
    </main>
  );
}
