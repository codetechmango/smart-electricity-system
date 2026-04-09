import "./globals.css";
import { Manrope, Space_Grotesk } from "next/font/google";

import AppProviders from "@/context/AppProviders";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata = {
  title: "Smart Electricity Monitoring System",
  description: "Production-grade electricity analytics dashboard for users and administrators.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${spaceGrotesk.variable} bg-zinc-50 text-zinc-900 antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}