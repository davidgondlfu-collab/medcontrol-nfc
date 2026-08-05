"use client";

import { CalendarDays, House, LogOut, Pill, Radio, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/medications", label: "Medicamentos", icon: Pill },
  { href: "/history", label: "Historial", icon: CalendarDays },
  { href: "/link-tag", label: "Vincular NFC", icon: Radio },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  async function signOut() { await createClient().auth.signOut(); router.push("/login"); router.refresh(); }
  return <div className="min-h-screen md:flex">
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-6 md:flex md:flex-col">
      <Logo />
      <nav className="mt-10 space-y-2">{links.map(({ href, label, icon: Icon }) => <NavLink key={href} href={href} label={label} icon={<Icon size={19} />} active={pathname === href} />)}</nav>
      <button onClick={signOut} className="mt-auto flex items-center gap-3 px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><LogOut size={18} />Cerrar sesión</button>
    </aside>
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-7 sm:px-7 md:pb-8">{children}</main>
    <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-slate-200 bg-white/95 px-1 py-2 backdrop-blur md:hidden">{links.map(({ href, label, icon: Icon }) => <NavLink key={href} href={href} label={label} icon={<Icon size={20} />} active={pathname === href} />)}</nav>
  </div>;
}

function Logo() { return <Link href="/" className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-600 text-lg font-black text-white">M</span><span><b className="block text-lg">MedControl</b><small className="font-bold tracking-widest text-blue-600">NFC</small></span></Link>; }
function NavLink({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) { return <Link href={href} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold md:flex-row md:gap-3 md:px-3 md:py-2.5 md:text-sm ${active ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}>{icon}{label}</Link>; }
