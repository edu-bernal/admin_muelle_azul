import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Los comprobantes de pago se suben dentro del Server Action y una foto
      // de celular supera con holgura el límite por defecto de 1 MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
