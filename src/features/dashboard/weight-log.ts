import type { WeightLog } from "./dashboard.types";

export type WeightEntryDraft = {
  date: string;
  weight: string;
};

export type WeightEntryErrors = Partial<Record<keyof WeightEntryDraft, string>>;

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function formatWeightLogLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day))).replace(".", "");
}

export function validateWeightEntry(draft: WeightEntryDraft, maxDate: string) {
  const errors: WeightEntryErrors = {};
  const weight = Number(draft.weight);

  if (!isValidIsoDate(draft.date)) {
    errors.date = "Pilih tanggal pencatatan yang valid.";
  } else if (draft.date > maxDate) {
    errors.date = "Tanggal pencatatan tidak boleh di masa depan.";
  }

  if (!draft.weight || !Number.isFinite(weight) || weight < 30 || weight > 300) {
    errors.weight = "Berat badan harus antara 30–300 kg.";
  }

  return {
    errors,
    value: Object.keys(errors).length === 0
      ? { date: draft.date, label: formatWeightLogLabel(draft.date), weight }
      : undefined,
  };
}

export function upsertWeightLog(logs: WeightLog[], entry: WeightLog) {
  const withoutSameDate = logs.filter((log) => log.date !== entry.date);
  return [...withoutSameDate, entry].sort((a, b) => a.date.localeCompare(b.date));
}
