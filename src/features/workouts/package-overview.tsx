import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { PathIcon } from "@phosphor-icons/react/dist/ssr/Path";
import Link from "next/link";
import type { ExercisePackage } from "./workout.types";
import { ExerciseSequence } from "./exercise-sequence";

export function PackageOverview({ workoutPackage }: { workoutPackage: ExercisePackage }) {
  return (
    <article className="package-overview">
      <Link className="back-link" href="/dashboard">
        <ArrowLeftIcon size={18} weight="regular" aria-hidden="true" />
        Kembali ke dashboard
      </Link>

      <header className="package-hero">
        <div className="package-hero-copy">
          <p className="date-label">{workoutPackage.dayLabel}</p>
          <h1>{workoutPackage.name}</h1>
          <p>{workoutPackage.purpose}</p>

          <dl className="package-facts">
            <div>
              <dt><ClockIcon size={18} weight="regular" aria-hidden="true" />Durasi</dt>
              <dd>{workoutPackage.estimatedMinutes} menit</dd>
            </div>
            <div>
              <dt><PathIcon size={18} weight="regular" aria-hidden="true" />Level</dt>
              <dd>{workoutPackage.difficulty}</dd>
            </div>
            <div>
              <dt><BarbellIcon size={18} weight="regular" aria-hidden="true" />Gerakan</dt>
              <dd>{workoutPackage.exercises.length} latihan</dd>
            </div>
          </dl>

          <Link className="button button-primary start-session-button" href={`/packages/${workoutPackage.id}/session`}>
            Mulai sesi
            <ArrowRightIcon size={19} weight="regular" aria-hidden="true" />
          </Link>
        </div>

        <div className="package-intent" aria-label="Fokus latihan">
          <span className="package-intent-icon" aria-hidden="true">
            <BarbellIcon size={32} weight="regular" />
          </span>
          <div>
            <span>Fokus hari ini</span>
            <strong>Daya tahan dasar</strong>
          </div>
          <p>Gerakan rendah benturan dengan jeda yang cukup untuk menjaga ritme.</p>
        </div>
      </header>

      <aside className="demo-notice">
        <InfoIcon size={21} weight="regular" aria-hidden="true" />
        <p>Rencana ini mengikuti data program terbarumu. Sesuaikan tempo dan berhenti bila tubuh terasa tidak nyaman.</p>
      </aside>

      <section className="sequence-section" aria-labelledby="sequence-title">
        <div className="sequence-heading">
          <div>
            <p className="module-kicker">Urutan sesi</p>
            <h2 id="sequence-title">Sub-latihan</h2>
          </div>
          <p>Selesaikan sesuai urutan dan gunakan waktu istirahat di setiap tahap.</p>
        </div>
        <ExerciseSequence exercises={workoutPackage.exercises} />
      </section>
    </article>
  );
}
