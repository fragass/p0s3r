import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat",
  description: "Chat privado (Next + Tailwind + Supabase)"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
