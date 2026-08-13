"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { completeWorkoutAction } from "./actions";
import type { ExercisePackage } from "./workout.types";
import { formatClock } from "./session-timer";
import { useWorkoutSession } from "./workout-session-provider";

export function SessionCompletion({ workoutPackage }: { workoutPackage: ExercisePackage }) {
  const activeElapsedMs = useWorkoutSession(
    (store) => store.session.activeElapsedMs,
  );
  const startedAtMs = useWorkoutSession((store) => store.session.startedAtMs);
  const completedAtMs = useWorkoutSession((store) => store.session.completedAtMs);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "error">("saving");
  const [saveMessage, setSaveMessage] = useState("Menyimpan progres latihan…");
  const [clientCompletionId] = useState(() => crypto.randomUUID());
  const submitted = useRef(false);
  const activeSeconds = Math.floor(activeElapsedMs / 1000);
  const streakThresholdSeconds = 30 * 60;
  const remainingSeconds = Math.max(0, streakThresholdSeconds - activeSeconds);
  const reachedThreshold = activeSeconds >= streakThresholdSeconds;

  useEffect(() => {
    if (submitted.current || completedAtMs === null) return;
    submitted.current = true;
    void completeWorkoutAction({
      packageId: workoutPackage.id,
      clientCompletionId,
      activeDurationSeconds: activeSeconds,
      startedAt: startedAtMs === null ? null : new Date(startedAtMs).toISOString(),
      completedAt: new Date(completedAtMs).toISOString(),
      results: workoutPackage.exercises.map((exercise) => ({
        subExerciseId: exercise.id,
        completedSets: exercise.sets,
        completedRepetitions: exercise.repetitions,
        activeDurationSeconds: 0,
        completed: true,
      })),
    }).then((result) => {
      setSaveState(result.ok ? "saved" : "error");
      setSaveMessage(result.ok
        ? result.newBadges.length
          ? `Sesi tersimpan. Badge baru: ${result.newBadges.map((badge) => badge.name).join(", ")}.`
          : result.message
        : result.message);
    });
  }, [activeSeconds, clientCompletionId, completedAtMs, startedAtMs, workoutPackage]);

  return (
    <main className="session-layout completion-layout">
      <section className="completion-card">
        <span className="completion-icon" aria-hidden="true">
          <CheckCircleIcon size={44} weight="fill" />
        </span>
        <p className="module-kicker">Latihan selesai</p>
        <h1>Sesi selesai</h1>
        <p>
          Kamu sudah menyelesaikan seluruh rangkaian {workoutPackage.name.toLowerCase()}.
        </p>

        <dl className="completion-stats">
          <div><dt>Waktu aktif</dt><dd>{formatClock(activeSeconds)}</dd></div>
          <div><dt>Gerakan</dt><dd>{workoutPackage.exercises.length} selesai</dd></div>
        </dl>

        <div className="threshold-note">
          <strong>
            {reachedThreshold ? "Target aktivitas harian tercapai" : "Teruskan ritme hari ini"}
          </strong>
          <p>
            {reachedThreshold
              ? "Waktu aktif sesi ini sudah mencapai ambang streak 30 menit."
              : `${Math.ceil(remainingSeconds / 60)} menit aktivitas lagi untuk mencapai ambang streak 30 menit.`}
          </p>
          <small>Streak diperbarui setelah total aktivitas tersimpan mencapai 30 menit dalam satu hari.</small>
        </div>

        <p className={`completion-save-status is-${saveState}`} role="status" aria-live="polite">{saveMessage}</p>

        <div className="completion-actions">
          <Link className="button button-primary" href="/dashboard">
            Kembali ke dashboard
            <ArrowRightIcon size={18} weight="regular" aria-hidden="true" />
          </Link>
          <Link className="button button-secondary" href={`/packages/${workoutPackage.id}`}>
            Lihat paket
          </Link>
        </div>
      </section>
    </main>
  );
}
