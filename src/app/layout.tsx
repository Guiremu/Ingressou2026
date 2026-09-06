import type { Metadata } from "next";
import { Archivo, Sora } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Ingressou",
  description: "Plataforma regional de venda de ingressos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${sora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#07070b] text-white">{children}</body>
    </html>
  );
}
