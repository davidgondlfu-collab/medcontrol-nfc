"use client";

import { CalendarCheck, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Intake, Medication } from "@/types/database";

export function HistoryPage() {
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationId, setMedicationId] = useState("");
  const [day, setDay] = useState("");

  async function load() {
    let query = createClient().from("intakes").select("id,taken_at,method,medications(name,color)").order("taken_at", { ascending: false }).limit(100);
    if (medicationId) query = query.eq("medication_id", medicationId);
    if (day) { const start = new Date(`${day}T00:00:00`); const end = new Date(start); end.setDate(end.getDate() + 1); query = query.gte("taken_at", start.toISOString()).lt("taken_at", end.toISOString()); }
    const { data, error } = await query;
    if (!error) setIntakes(data ?? []);
  }

  useEffect(() => { createClient().from("medications").select("id,name,description,photo_url,color,active,dose,unit,nfc_identifier").order("name").then(({ data }) => setMedications(data ?? [])); }, []);
  useEffect(() => { load(); }, [medicationId, day]);

  return <><header><p className="text-sm font-semibold text-blue-600">REGISTRO</p><h1 className="mt-1 text-3xl font-bold">Historial</h1><p className="mt-1 text-slate-500">Tus tomas registradas.</p></header><div className="mt-6 grid gap-3 sm:grid-cols-2"><select className="field" value={medicationId} onChange={(event) => setMedicationId(event.target.value)}><option value="">Todos los medicamentos</option>{medications.map((medication) => <option value={medication.id} key={medication.id}>{medication.name}</option>)}</select><input className="field" type="date" value={day} onChange={(event) => setDay(event.target.value)} /></div><section className="card mt-5 divide-y divide-slate-100">{intakes.length === 0 ? <div className="p-10 text-center text-slate-500">No hay tomas con estos filtros.</div> : intakes.map((intake) => <div className="flex items-center gap-4 p-5" key={intake.id}><span className="grid size-10 place-items-center rounded-full bg-blue-50 text-blue-700">{intake.method === "nfc" ? <Radio size={18} /> : <CalendarCheck size={18} />}</span><div className="flex-1"><p className="font-bold">{intake.medications[0]?.name ?? "Medicamento"}</p><p className="text-sm text-slate-500">{new Date(intake.taken_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</p></div><span className="text-xs font-bold uppercase text-slate-400">{intake.method}</span></div>)}</section></>;
}
