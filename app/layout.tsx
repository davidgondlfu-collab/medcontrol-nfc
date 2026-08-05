import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = { title: "MedControl NFC", description: "Control de medicamentos mediante NFC", manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { themeColor: "#2563eb" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><PwaRegister />{children}</body></html>;
}
