import { ImageResponse } from "next/og";

export const alt = "Muelle Azul — Administración del Condominio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagen de vista previa al compartir el enlace (WhatsApp, correo, redes).
 * Se genera como PNG porque los previsualizadores no soportan SVG.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0369a1",
          backgroundImage:
            "linear-gradient(135deg, #0ea5e9 0%, #0369a1 45%, #075985 100%)",
        }}
      >
        <svg width="200" height="200" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="32" fill="#ffffff" fillOpacity="0.12" />
          <circle cx="32" cy="24" r="9" fill="#facc15" />
          <path
            d="M4 40 Q 11 33, 18 40 T 32 40 T 46 40 T 60 40"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M4 50 Q 11 43, 18 50 T 32 50 T 46 50 T 60 50"
            stroke="#7dd3fc"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        <div
          style={{
            marginTop: 36,
            fontSize: 82,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -2,
          }}
        >
          Muelle Azul
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 34,
            color: "#e0f2fe",
          }}
        >
          Administración del Condominio
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 18,
            paddingBottom: 18,
            paddingLeft: 34,
            paddingRight: 34,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.15)",
            fontSize: 24,
            color: "#f0f9ff",
          }}
        >
          Cuotas · Pagos · Estados de cuenta
        </div>
      </div>
    ),
    size,
  );
}
