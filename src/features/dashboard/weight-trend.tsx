"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrendDownIcon } from "@phosphor-icons/react/dist/ssr/TrendDown";
import { TrendUpIcon } from "@phosphor-icons/react/dist/ssr/TrendUp";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { recordWeightAction } from "./actions";
import { calculateWeightProgress } from "./progress";
import type { WeightLog } from "./dashboard.types";
import { upsertWeightLog, validateWeightEntry, type WeightEntryErrors } from "./weight-log";
import { WeightTrendChart } from "./weight-trend-chart";
import { remainingWeight, type GoalDirection } from "@/lib/sehatin/goals";

type WeightTrendProps = {
  logs: WeightLog[];
  initialWeight: number;
  targetWeight: number;
  weeklyTargetWeight: number;
  maxDate: string;
  goalDirection?: GoalDirection;
};

const formatKg = (value: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);

export function WeightTrend({ logs: initialLogs, initialWeight, targetWeight, weeklyTargetWeight, maxDate, goalDirection = "lose" }: WeightTrendProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [draft, setDraft] = useState({ date: maxDate, weight: "" });
  const [errors, setErrors] = useState<WeightEntryErrors>({});
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const latest = logs.at(-1);
  const previous = logs.at(-2);
  const currentWeight = latest?.weight ?? initialWeight;
  const change = currentWeight - initialWeight;
  const totalProgress = calculateWeightProgress({ initialWeight, currentWeight, targetWeight });
  const latestDelta = latest && previous ? latest.weight - previous.weight : 0;
  const remainingThisWeek = remainingWeight(currentWeight, weeklyTargetWeight, goalDirection);
  const TrendIcon = goalDirection === "gain" ? TrendUpIcon : TrendDownIcon;

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateWeightEntry(draft, maxDate);
    setErrors(result.errors);
    if (!result.value) {
      setMessage("Periksa kembali kolom yang ditandai.");
      return;
    }

    const replacesExisting = logs.some((log) => log.date === result.value?.date);
    startTransition(async () => {
      const outcome = await recordWeightAction({ date: result.value!.date, weight: result.value!.weight });
      if (!outcome.ok) {
        setMessage(outcome.message);
        return;
      }
      setLogs((current) => upsertWeightLog(current, result.value!));
      setDraft((current) => ({ ...current, weight: "" }));
      setMessage(`${outcome.message} Catatan ${result.value!.label} ${replacesExisting ? "diperbarui" : "ditambahkan"}.`);
      router.refresh();
    });
  }

  return (
    <section className="dashboard-module weight-trend" aria-labelledby="weight-trend-title">
      <div className="module-heading split">
        <div>
          <p className="module-kicker">Perjalananmu</p>
          <h2 id="weight-trend-title">Tracking berat badan</h2>
        </div>
        <div className="trend-summary">
          <TrendIcon size={18} weight="regular" aria-hidden="true" />
          <span>{change > 0 ? `Naik ${formatKg(change)} kg` : change < 0 ? `Turun ${formatKg(Math.abs(change))} kg` : "Berat stabil"} sejak mulai</span>
        </div>
      </div>

      <div className="weight-entry-panel">
        <div>
          <h3>Catat berat terbaru</h3>
          <p>Satu catatan per tanggal. Menyimpan tanggal yang sama akan memperbarui data sebelumnya.</p>
        </div>
        <form className="weight-entry-form" onSubmit={submitEntry} noValidate>
          <label className="form-field">
            <span>Tanggal</span>
            <input
              type="date"
              max={maxDate}
              value={draft.date}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? "weight-date-error" : undefined}
              onChange={(event) => {
                setDraft((current) => ({ ...current, date: event.target.value }));
                setErrors((current) => ({ ...current, date: undefined }));
                setMessage("");
              }}
            />
            {errors.date && <small className="field-error" id="weight-date-error">{errors.date}</small>}
          </label>
          <label className="form-field">
            <span>Berat badan</span>
            <span className="input-with-unit">
              <input
                aria-label="Berat badan"
                type="number"
                inputMode="decimal"
                min="30"
                max="300"
                step="0.1"
                placeholder={formatKg(currentWeight)}
                value={draft.weight}
                aria-invalid={Boolean(errors.weight)}
                aria-describedby={errors.weight ? "weight-value-error" : undefined}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, weight: event.target.value }));
                  setErrors((current) => ({ ...current, weight: undefined }));
                  setMessage("");
                }}
              />
              <small aria-hidden="true">kg</small>
            </span>
            {errors.weight && <small className="field-error" id="weight-value-error">{errors.weight}</small>}
          </label>
          <button className="button button-primary" type="submit" disabled={isPending}><PlusIcon size={18} weight="bold" aria-hidden="true" />{isPending ? "Menyimpan…" : "Simpan catatan"}</button>
        </form>
        <p className={Object.keys(errors).length ? "weight-entry-message is-error" : "weight-entry-message"} role="status" aria-live="polite">
          {message && !Object.keys(errors).length && <CheckCircleIcon size={17} weight="fill" aria-hidden="true" />}
          {message}
        </p>
      </div>

      <div className="weight-insights" aria-label="Ringkasan berat badan">
        <div><span>Saat ini</span><strong>{formatKg(currentWeight)} kg</strong></div>
        <div><span>Progres target</span><strong>{totalProgress}%</strong></div>
        <div>
          <span>Catatan terakhir</span>
          <strong>{latestDelta < 0 ? `Turun ${formatKg(Math.abs(latestDelta))} kg` : latestDelta > 0 ? `Naik ${formatKg(latestDelta)} kg` : "Tetap stabil"}</strong>
        </div>
        <div>
          <span>Target minggu ini</span>
          <strong>{remainingThisWeek === 0 ? "Tercapai" : `${formatKg(remainingThisWeek)} kg lagi`}</strong>
        </div>
      </div>

      <figure>
        <WeightTrendChart logs={logs} />
        <figcaption>
          Grafik menggunakan catatan tersimpan milik akunmu. Progres keseluruhan menuju target mencapai {totalProgress}%.
        </figcaption>
      </figure>

      <div className="weight-history">
        <div className="weight-history-heading">
          <div><p className="module-kicker">Riwayat</p><h3>Catatan mingguan</h3></div>
          <span>{logs.length} catatan</span>
        </div>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Riwayat berat badan, dapat digulir secara horizontal">
          <table>
            <thead><tr><th scope="col">Tanggal</th><th scope="col">Berat</th><th scope="col">Perubahan</th></tr></thead>
            <tbody>
              {[...logs].reverse().map((log) => {
                const index = logs.findIndex((item) => item.date === log.date);
                const prior = index > 0 ? logs[index - 1] : undefined;
                const delta = prior ? log.weight - prior.weight : null;
                return (
                  <tr key={log.date}>
                    <td>{log.label}</td>
                    <td>{formatKg(log.weight)} kg</td>
                    <td>{delta === null ? "Catatan awal" : delta === 0 ? "Tetap" : `${delta < 0 ? "−" : "+"}${formatKg(Math.abs(delta))} kg`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
