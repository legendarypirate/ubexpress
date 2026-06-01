import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BeeDeliv — Улаанбаатарын хүргэлтийн платформ",
  description:
    "BeeDeliv нь дэлгүүр, жолооч болон хэрэглэгчийг нэгтгэсэн Улаанбаатарын хурдан, ил тод хүргэлтийн систем.",
  icons: {
    icon: "/beelogo.jpg",
    shortcut: "/beelogo.jpg",
    apple: "/beelogo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn">
      <body className={`${nunito.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
