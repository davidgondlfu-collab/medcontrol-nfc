/** Helpers run in the user's browser, so Date getters use their local time zone. */
export const DEFAULT_MEDICATION_DAY_CUTOFF = "05:00";

function cutoffMinutes(cutoff: string) {
  const [hours = "5", minutes = "0"] = cutoff.slice(0, 5).split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function medicationDayKey(value: Date | string, cutoff = DEFAULT_MEDICATION_DAY_CUTOFF) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (minutes < cutoffMinutes(cutoff)) date.setDate(date.getDate() - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentMedicationDay(cutoff = DEFAULT_MEDICATION_DAY_CUTOFF) {
  return medicationDayKey(new Date(), cutoff);
}

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
