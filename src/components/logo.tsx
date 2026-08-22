/**
 * Logo de Muelle Azul: sol sobre el mar.
 * Mismo trazo que el logo de los recibos PDF (src/lib/pdf/recibo-document.tsx),
 * en versión sólida para que se lea bien en tamaños pequeños.
 */
export function Logo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Muelle Azul"
      className={className}
    >
      <circle cx="32" cy="32" r="32" fill="#0369a1" />
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
  );
}
