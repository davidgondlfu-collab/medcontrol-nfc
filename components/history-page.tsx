"use client";

import { CalendarCheck, ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_MEDICATION_DAY_CUTOFF, localDateKey, medicationDayKey } from "@/lib/medication-day";
import type { Intake } from "@/types/database";

type CalendarIntake = Intake & { medication_id: string };

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
}

export function HistoryPage() {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [cutoff, setCutoff] = useState(DEFAULT_MEDICATION_DAY_CUTOFF);
  const [intakes, setIntakes] = useState<CalendarIntake[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await createClient().from("profiles").select("medication_day_cutoff_time").eq("id", user.id).single();
      setCutoff((data?.medication_day_cutoff_time ?? DEFAULT_MEDICATION_DAY_CUTOFF).slice(0, 5));
    });
  }, []);

  useEffect(() => {
    async function loadMonth() {
      // Extra day on each side covers any cutoff time and time-zone offset.
      const from = new Date(cursor.getFullYear(), cursor.getMonth(), 0).toISOString();
      const until = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 2).toISOString();
      const { data } = await createClient().from("intakes").select("id,medication_id,taken_at,method,medications(name,color)").gte("taken_at", from).lt("taken_at", until).order("taken_at", { ascending: true });
      setIntakes(data ?? []);
    }
    loadMonth();
    setSelectedDay(null);
  }, [cursor]);

  const byMedicationDay = useMemo(() => {
    const start = localDateKey(cursor);
    const end = localDateKey(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    const grouped = new Map<string, CalendarIntake[]>();
    intakes.forEach((intake) => {
      const key = medicationDayKey(intake.taken_at, cutoff);
      if (key < start || key > end) return;
      grouped.set(key, [...(grouped.get(key) ?? []), intake]);
    });
    return grouped;
  }, [cursor, cutoff, intakes]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
  }, [cursor]);
  const details = selectedDay ? byMedicationDay.get(selectedDay) ?? [] : [];

  return <><header className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-blue-600">REGISTRO</p><h1 className="mt-1 text-3xl font-bold">Historial</h1><p className="mt-1 text-slate-500">Tomas agrupadas por día de medicación.</p></div></header><section className="card mt-7 overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5"><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Mes anterior"><ChevronLeft /></button><h2 className="capitalize font-bold">{monthLabel(cursor)}</h2><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Mes siguiente"><ChevronRight /></button></div><div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-xs">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}</div><div className="grid grid-cols-7">{calendarDays.map((date) => { const key = localDateKey(date); const dayIntakes = byMedicationDay.get(key) ?? []; const colors = [...new Map(dayIntakes.map((intake) => [intake.medication_id, intake.medications[0]?.color ?? "#64748b"])).values()]; const inMonth = date.getMonth() === cursor.getMonth(); const selected = key === selectedDay; return <button key={key} onClick={() => setSelectedDay(key)} className={`min-h-18 border-b border-r border-slate-100 p-1.5 text-left transition sm:min-h-24 sm:p-2 ${inMonth ? "bg-white hover:bg-blue-50" : "bg-slate-50/70 text-slate-300"} ${selected ? "ring-2 ring-inset ring-blue-500" : ""}`}><span className={`grid size-6 place-items-center rounded-full text-xs font-semibold sm:size-7 ${key === localDateKey(new Date()) ? "bg-blue-600 text-white" : ""}`}>{date.getDate()}</span>{colors.length > 0 && <span className="mt-1 flex flex-wrap gap-1">{colors.slice(0, 6).map((color, index) => <i key={`${color}-${index}`} className="size-1.5 rounded-full sm:size-2" style={{ backgroundColor: color }} />)}</span>}</button>; })}</div></section>{selectedDay && <section className="card mt-5 overflow-hidden"><div className="border-b border-slate-100 p-5"><h2 className="font-bold">Tomas del {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</h2><p className="mt-1 text-sm text-slate-500">La hora mostrada es la hora real de registro.</p></div>{details.length === 0 ? <p className="p-6 text-sm text-slate-500">No hay tomas registradas este día.</p> : <div className="divide-y divide-slate-100">{details.map((intake) => <div key={intake.id} className="flex items-center gap-3 p-4 sm:p-5"><span className="size-3 rounded-full" style={{ backgroundColor: intake.medications[0]?.color ?? "#64748b" }} /><div className="min-w-0 flex-1"><p className="font-semibold">{intake.medications[0]?.name ?? "Medicamento"}</p><p className="text-sm text-slate-500">{new Date(intake.taken_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p></div><span className="flex items-center gap-1 text-xs font-bold uppercase text-slate-400">{intake.method === "nfc" ? <Radio size={14} /> : <CalendarCheck size={14} />}{intake.method}</span></div>)}</div>}</section>}</>;
}
