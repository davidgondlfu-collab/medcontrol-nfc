export type Schedule = { id: string; time: string; days_of_week: number[] };
export type NfcTag = { id: string; tag_uid: string };
export type Medication = { id: string; name: string; description: string | null; photo_url: string | null; color: string; active: boolean; dose: number | null; unit: string | null; nfc_uid?: string | null; nfc_identifier?: string | null; schedules?: Schedule[]; nfc_tags?: NfcTag[] };
export type Intake = { id: string; taken_at: string; method: "manual" | "nfc"; medications: { name: string; color: string } | null };
