import type { ReactNode } from "react";

export const metadata = {
  title: "Tokenized Commodities Demo",
  description: "Bilateral commodity-linked agreement demo on Cardano PreProd"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#f8fafc" }}>{children}</body>
    </html>
  );
}
