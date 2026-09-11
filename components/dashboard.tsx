"use client";

import { Check, Clock3, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { currentMedicationDay, DEFAULT_MEDICATION_DAY_CUTOFF, medicationDayKey } from "@/lib/medication-day";
import type { Medication } from "@/types/database";

type DashboardMedication = Pick<Medication, "id" | "name" | "description" | "photo_url" | "color" | "active" | "dose" | "unit" | "usage_type"> & { schedules: Array<{ time: string; days_of_week: number[] }> };

export function Dashboard() {
  const [medications, setMedications] = useState<DashboardMedication[]>([]);
  const [takenIds, setTakenIds] = useState<string[]>([]);
  const [lastTaken, setLastTaken] = useState<{ name: string; taken_at: string } | null>(null);
  const [cutoff, setCutoff] = useState(DEFAULT_MEDICATION_DAY_CUTOFF);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const [profileResult, medsResult, recentResult, latestResult] = await Promise.all([
      supabase.from("profiles").select("medication_day_cutoff_time").single(),
      supabase.from("medications").select("id,name,description,photo_url,color,active,dose,unit,usage_type,schedules(time,days_of_week)").eq("active", true),
      supabase.from("intakes").select("medication_id,taken_at,medications(name)").gte("taken_at", since).order("taken_at", { ascending: false }),
      supabase.from("intakes").select("medication_id,taken_at,medications(name)").order("taken_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const configuredCutoff = (profileResult.data?.medication_day_cutoff_time ?? DEFAULT_MEDICATION_DAY_CUTOFF).slice(0, 5);
    const medicationDay = currentMedicationDay(configuredCutoff);
    setCutoff(configuredCutoff);
    setMedications(medsResult.data ?? []);
    const todayIntakes = (recentResult.data ?? []).filter((intake) => medicationDayKey(intake.taken_at, configuredCutoff) === medicationDay);
    setTakenIds([...new Set(todayIntakes.map((intake) => intake.medication_id))]);
    const latest = latestResult.data;
    setLastTaken(latest ? { taken_at: latest.taken_at, name: latest.medications[0]?.name ?? "Medicamento" } : null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  const medicationDay = currentMedicationDay(cutoff);
  const medicationWeekday = new Date(`${medicationDay}T12:00:00`).getDay();
  const scheduled = medications.filter((medication) => medication.usage_type !== "occasional" && medication.schedules.some((schedule) => schedule.days_of_week.includes(medicationWeekday)));
  const pending = scheduled.filter((medication) => !takenIds.includes(medication.id));
  const completed = scheduled.filter((medication) => takenIds.includes(medication.id));
  const upcoming = pending.flatMap((medication) => medication.schedules.filter((schedule) => schedule.days_of_week.includes(medicationWeekday)).map((schedule) => ({ name: medication.name, time: schedule.time.slice(0, 5) }))).filter((item) => item.time >= new Date().toTimeString().slice(0, 5)).sort((a, b) => a.time.localeCompare(b.time))[0];

  async function take(medication: DashboardMedication) { await createClient().from("intakes").insert({ medication_id: medication.id, method: "manual" }); load(); }

  return <><header className="flex items-start justify-between"><div><p className="text-sm font-semibold text-blue-600">MEDCONTROL NFC</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Buenos días</h1><p className="mt-1 text-slate-500">Así va tu tratamiento de hoy.</p></div><Link href="/medications" className="button"><Plus size={18} /><span className="hidden sm:inline">Añadir</span></Link></header><section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Pendientes hoy" value={String(pending.length)} icon={<Clock3 className="text-amber-500" />} /><Stat label="Tomados hoy" value={String(completed.length)} icon={<Check className="text-emerald-600" />} /><Stat label="Próxima toma" value={upcoming ? `${upcoming.name} · ${upcoming.time}` : "Sin más tomas"} icon={<Clock3 className="text-blue-600" />} /><Stat label="Última toma" value={lastTaken ? `${lastTaken.name} · ${new Date(lastTaken.taken_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : "Sin registros"} icon={<Check className="text-violet-600" />} /></section><section className="card mt-6 overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="font-bold">Medicamentos pendientes</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{pending.length} pendientes</span></div>{loading ? <p className="p-6 text-sm text-slate-500">Cargando tus medicamentos…</p> : pending.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No tienes tomas pendientes para este día de medicación.</div> : <div className="divide-y divide-slate-100">{pending.map((medication) => <div key={medication.id} className="flex items-center gap-4 p-4 sm:p-5"><span className="size-11 shrink-0 rounded-full" style={{ backgroundColor: medication.color }} /><div className="min-w-0 flex-1"><p className="font-bold">{medication.name}</p><p className="mt-0.5 text-sm text-slate-500">{medication.schedules.filter((schedule) => schedule.days_of_week.includes(medicationWeekday)).map((schedule) => schedule.time.slice(0, 5)).join(" · ")}</p></div><button onClick={() => take(medication)} className="button button-secondary">Registrar</button></div>)}</div>}</section></>;
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="card p-5"><div className="flex items-center gap-2">{icon}<p className="text-sm text-slate-500">{label}</p></div><p className="mt-3 truncate text-lg font-bold">{value}</p></div>; }
