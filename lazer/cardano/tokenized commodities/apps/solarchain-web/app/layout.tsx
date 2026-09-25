import type { ReactNode } from "react";

export const metadata = {
  title: "SolarChain Demo",
  description: "Solar settlement demo on Cardano PreProd"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#f8fafc" }}>{children}</body>
    </html>
  );
}
