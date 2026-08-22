import type { Metadata } from "next";
import "./globals.css";

const TITULO = "Muelle Azul — Administración del Condominio";
const DESCRIPCION =
  "Sistema de administración del condominio de playa Muelle Azul: propietarios, cuotas, pagos y estados de cuenta.";

/**
 * URL base para que og:image se resuelva a una dirección absoluta.
 * Sin esto los previsualizadores de enlaces no encuentran la imagen.
 */
function urlBase(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(urlBase()),
  title: TITULO,
  description: DESCRIPCION,
  applicationName: "Muelle Azul",
  openGraph: {
    type: "website",
    siteName: "Muelle Azul",
    locale: "es_PE",
    title: TITULO,
    description: DESCRIPCION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
  },
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
