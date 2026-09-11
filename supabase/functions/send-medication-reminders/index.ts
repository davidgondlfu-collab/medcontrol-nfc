import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; timezone: string };
type ScheduleRow = { id: string; time: string; days_of_week: number[]; medication: { id: string; user_id: string; name: string; active: boolean; usage_type: string; reminders_enabled: boolean } };

const corsHeaders = { "Content-Type": "application/json" };

function localParts(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  return Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
}
function medicationDay(parts: Record<string, string>, cutoff: string) {
  const [cutoffHour, cutoffMinute] = cutoff.slice(0, 5).split(":").map(Number);
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12));
  if (Number(parts.hour) * 60 + Number(parts.minute) < cutoffHour * 60 + cutoffMinute) date.setUTCDate(date.getUTCDate() - 1);
  const key = date.toISOString().slice(0, 10);
  return { key, weekday: date.getUTCDay() };
}

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceRole);
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const subject = Deno.env.get("VAPID_SUBJECT")!;
  if (!publicKey || !privateKey || !subject) return new Response(JSON.stringify({ error: "Missing VAPID secrets" }), { status: 500, headers: corsHeaders });
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const [{ data: subscriptions }, { data: schedules }, { data: profiles }, { data: intakes }] = await Promise.all([
    supabase.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth,timezone").eq("active", true),
    supabase.from("schedules").select("id,time,days_of_week,medication:medications!inner(id,user_id,name,active,usage_type,reminders_enabled)"),
    supabase.from("profiles").select("id,medication_day_cutoff_time"),
    supabase.from("intakes").select("medication_id,taken_at").gte("taken_at", since),
  ]);
  const cutoffByUser = new Map((profiles ?? []).map((profile) => [profile.id, profile.medication_day_cutoff_time?.slice(0, 5) || "05:00"]));
  const activeSubscriptions = (subscriptions ?? []) as Subscription[];
  const scheduledRows = (schedules ?? []) as ScheduleRow[];
  let delivered = 0;

  for (const subscription of activeSubscriptions) {
    const parts = localParts(subscription.timezone || "UTC");
    const cutoff = cutoffByUser.get(subscription.user_id) ?? "05:00";
    const day = medicationDay(parts, cutoff);
    const minute = `${parts.hour}:${parts.minute}`;
    const userSchedules = scheduledRows.filter(({ medication, time, days_of_week }) => medication.user_id === subscription.user_id && medication.active && medication.usage_type === "scheduled" && medication.reminders_enabled && days_of_week.includes(day.weekday) && time.slice(0, 5) === minute);
    for (const schedule of userSchedules) {
      const alreadyTaken = (intakes ?? []).some((intake) => intake.medication_id === schedule.medication.id && medicationDay(localPartsForDate(intake.taken_at, subscription.timezone), cutoff).key === day.key);
      if (alreadyTaken) continue;
      // The local scheduled minute plus zone identifies one occurrence. It is
      // stored as an instant only for idempotency; it never changes taken_at.
      const scheduledAt = new Date().toISOString().slice(0, 16) + ":00.000Z";
      const { data: delivery, error } = await supabase.from("notification_deliveries").insert({ user_id: subscription.user_id, medication_id: schedule.medication.id, scheduled_at: scheduledAt, notification_type: `scheduled_reminder:${subscription.id}` }).select("id").single();
      if (error || !delivery) continue;
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: "💊 Hora de tu toma", body: `Es hora de tomar ${schedule.medication.name}`, url: "/" }));
        await supabase.from("notification_deliveries").update({ sent_at: new Date().toISOString() }).eq("id", delivery.id);
        delivered += 1;
      } catch (pushError) {
        const statusCode = (pushError as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) await supabase.from("push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("id", subscription.id);
      }
    }
  }
  return new Response(JSON.stringify({ delivered }), { headers: corsHeaders });
});

function localPartsForDate(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  return Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value: part }) => [type, part]));
}
