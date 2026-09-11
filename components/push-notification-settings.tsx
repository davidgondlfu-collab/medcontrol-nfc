"use client";

import { Bell, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function vapidKeyToBytes(value: string) {
  const padded = `${value}${"=".repeat((4 - value.length % 4) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function PushNotificationSettings() {
  const [status, setStatus] = useState<"loading" | "enabled" | "disabled" | "unsupported">("loading");
  const [message, setMessage] = useState("");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setStatus("unsupported");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription && Notification.permission === "granted" ? "enabled" : "disabled");
    }
    check().catch(() => setStatus("disabled"));
  }, []);

  async function enable() {
    setMessage("");
    if (!publicKey) return setMessage("Falta configurar la clave pública VAPID.");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setMessage("No se concedió permiso para las notificaciones.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyToBytes(publicKey) });
      const keys = subscription.toJSON().keys;
      const { data: { user } } = await createClient().auth.getUser();
      if (!user || !keys?.p256dh || !keys.auth) return setMessage("No se pudo asociar este dispositivo a tu cuenta.");
      const { error } = await createClient().from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (error) return setMessage(error.message);
      setStatus("enabled");
    } catch { setMessage("No se pudo activar las notificaciones en este dispositivo."); }
  }

  const label = status === "enabled" ? "Activadas" : status === "unsupported" ? "No compatibles" : "Desactivadas";
  return <section className="card mt-5 max-w-xl p-6"><div className="flex gap-3"><Bell className="mt-0.5 text-blue-600" /><div className="flex-1"><h2 className="font-bold">Notificaciones</h2><p className="mt-1 text-sm text-slate-500">Estado: <b>{status === "loading" ? "Comprobando…" : label}</b></p><p className="mt-2 text-sm leading-6 text-slate-500">Recibe recordatorios de las tomas programadas incluso con la app cerrada.</p>{status !== "enabled" && status !== "unsupported" && <button onClick={enable} className="button mt-4">Activar notificaciones</button>}{status === "enabled" && <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600"><Check size={17} />Este dispositivo está registrado.</p>}{message && <p className="mt-3 text-sm text-rose-600">{message}</p>}</div></div></section>;
}
