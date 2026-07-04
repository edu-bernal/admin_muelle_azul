import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muelle Azul — Administración del Condominio",
  description:
    "Sistema de administración del condominio de playa Muelle Azul: propietarios, cuotas, pagos y estados de cuenta.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
