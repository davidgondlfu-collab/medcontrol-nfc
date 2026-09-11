export type Schedule = { id: string; time: string; days_of_week: number[] };
export type NfcTag = { id: string; tag_uid: string };
export type Medication = { id: string; name: string; description: string | null; photo_url: string | null; color: string; active: boolean; dose: number | null; unit: string | null; usage_type?: "scheduled" | "occasional"; reminders_enabled?: boolean; nfc_uid?: string | null; nfc_identifier?: string | null; schedules?: Schedule[]; nfc_tags?: NfcTag[] };
/**
 * El select de historial usa la relación de Supabase `medications(name,color)`.
 * Supabase devuelve relaciones embebidas como arreglos, incluso cuando la
 * relación SQL sea muchos-a-uno desde intakes hacia medications.
 */
export type Intake = {
  id: string;
  taken_at: string;
  method: "manual" | "nfc";
  medications: Array<{ name: string; color: string }>;
};

export type ProfileSettings = {
  name: string;
  nfc_duplicate_window_hours: number;
  medication_day_cutoff_time: string;
};
