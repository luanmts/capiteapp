import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Providers from "./Providers";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Previsão.io - Mercado de Previsões",
  description:
    "Plataforma brasileira de mercado de previsões. Preveja eventos do mundo real e ganhe recompensas.",
  keywords: "mercado de previsões, prediction market, Brasil, apostas, previsões",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={montserrat.variable}>
      <body className="bg-background text-white min-h-screen font-sans antialiased">
        <Providers>
          <Header />
          <main className="pt-16 pb-20 md:pb-0 min-h-screen">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
