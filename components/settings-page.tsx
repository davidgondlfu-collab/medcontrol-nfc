"use client";

import { Check, Clock3, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_MEDICATION_DAY_CUTOFF } from "@/lib/medication-day";
import { PushNotificationSettings } from "@/components/push-notification-settings";

export function SettingsPage() {
  const [name, setName] = useState("");
  const [windowHours, setWindowHours] = useState("4");
  const [cutoffTime, setCutoffTime] = useState(DEFAULT_MEDICATION_DAY_CUTOFF);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await createClient().from("profiles").select("name,nfc_duplicate_window_hours,medication_day_cutoff_time").eq("id", user.id).single();
      setName(data?.name || user.user_metadata.name || "");
      setWindowHours(String(data?.nfc_duplicate_window_hours ?? 4));
      setCutoffTime((data?.medication_day_cutoff_time ?? DEFAULT_MEDICATION_DAY_CUTOFF).slice(0, 5));
    });
  }, []);

  async function save() {
    const { data: { user } } = await createClient().auth.getUser();
    if (!user) return;
    await createClient().from("profiles").upsert({
      id: user.id,
      name,
      nfc_duplicate_window_hours: Number(windowHours) || 4,
      medication_day_cutoff_time: cutoffTime || DEFAULT_MEDICATION_DAY_CUTOFF,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return <><header><p className="text-sm font-semibold text-blue-600">PREFERENCIAS</p><h1 className="mt-1 text-3xl font-bold">Configuración</h1></header><section className="card mt-8 max-w-xl p-6"><h2 className="font-bold">Perfil</h2><label className="mt-5 block text-sm font-semibold">Tu nombre<input className="field mt-1.5" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" /></label><button onClick={save} className="button mt-5">{saved ? <><Check size={18} />Guardado</> : "Guardar cambios"}</button></section><PushNotificationSettings /><section className="card mt-5 max-w-xl p-6"><div className="flex gap-3"><Clock3 className="mt-0.5 text-blue-600" /><div className="flex-1"><h2 className="font-bold">Día de medicación</h2><p className="mt-1 text-sm leading-6 text-slate-500">Las tomas anteriores a esta hora se asignan al día de medicación anterior.</p><label className="mt-4 block text-sm font-semibold">Hora de cambio de día<input type="time" className="field mt-1.5" value={cutoffTime} onChange={(event) => setCutoffTime(event.target.value)} /></label></div></div></section><section className="card mt-5 max-w-xl p-6"><div className="flex gap-3"><Smartphone className="mt-0.5 text-blue-600" /><div className="flex-1"><h2 className="font-bold">Control NFC</h2><p className="mt-1 text-sm leading-6 text-slate-500">Evita registrar dos veces la misma toma dentro de esta ventana.</p><label className="mt-4 block text-sm font-semibold">Ventana anti-duplicado (horas)<input type="number" min="1" max="24" className="field mt-1.5" value={windowHours} onChange={(event) => setWindowHours(event.target.value)} /></label></div></div></section></>;
}
