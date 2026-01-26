import type { Metadata } from "next";
import "@/assets/css/globals.css";

export const metadata: Metadata = {
  title: "Sistema de Controle de Curso",
  description: "Sistema de gerenciamento do curso Capacitação Destino",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
