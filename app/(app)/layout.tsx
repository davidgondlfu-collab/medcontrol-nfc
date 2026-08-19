import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Server-side protection for the application area. Authentication is kept out
 * of Edge middleware so a slow Auth request can never block route handling.
 */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
