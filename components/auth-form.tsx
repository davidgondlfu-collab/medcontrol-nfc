"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login"; const router = useRouter(); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(formData: FormData) {
    setError(""); setMessage(""); setLoading(true); const supabase = createClient();
    const email = String(formData.get("email")); const password = String(formData.get("password"));
    const result = isLogin ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { name: String(formData.get("name")) } } });
    setLoading(false); if (result.error) return setError(result.error.message);
    if (!isLogin && !result.data.session) return setMessage("Revisa tu correo para confirmar la cuenta.");
    router.push("/"); router.refresh();
  }
  return <main className="grid min-h-screen place-items-center p-4"><section className="card w-full max-w-md p-7 sm:p-9"><div className="mb-8"><span className="grid size-11 place-items-center rounded-xl bg-blue-600 text-xl font-black text-white">M</span><h1 className="mt-5 text-2xl font-bold">{isLogin ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h1><p className="mt-1 text-sm text-slate-500">{isLogin ? "Controla tus tomas de forma sencilla." : "Empieza a organizar tu tratamiento."}</p></div><form action={submit} className="space-y-4">{!isLogin && <label className="block text-sm font-medium">Nombre<input name="name" required className="field mt-1.5" placeholder="Tu nombre" /></label>}<label className="block text-sm font-medium">Correo electrónico<input name="email" type="email" required className="field mt-1.5" placeholder="tu@email.com" /></label><label className="block text-sm font-medium">Contraseña<input name="password" type="password" minLength={6} required className="field mt-1.5" placeholder="Mínimo 6 caracteres" /></label>{error && <p className="text-sm text-rose-600">{error}</p>}{message && <p className="text-sm text-emerald-600">{message}</p>}<button className="button w-full" disabled={loading}>{loading ? "Un momento…" : isLogin ? "Iniciar sesión" : "Crear cuenta"}</button></form><p className="mt-6 text-center text-sm text-slate-500">{isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"} <Link className="font-bold text-blue-600" href={isLogin ? "/register" : "/login"}>{isLogin ? "Regístrate" : "Inicia sesión"}</Link></p></section></main>;
}
