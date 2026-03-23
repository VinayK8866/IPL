import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LatencyProvider } from "@/providers/LatencyProvider";
import { VFXProvider } from "@/components/dashboard/vfx/VFXProvider";
import { CyberBackground } from "@/components/dashboard/vfx/CyberBackground";
import { EventExplosion } from "@/components/dashboard/vfx/EventExplosion";

const inter = Inter({ subsets: ["latin"], weight: ['400', '700', '900'] });

export const metadata: Metadata = {
  title: "CRICKET PULSE | Real-Time visualization",
  description: "High-adrenaline, real-time cricket visualization engine.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#0B0E14] selection:bg-[#FF3366] selection:text-white" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased text-white overflow-x-hidden`} suppressHydrationWarning>
        <LatencyProvider>
          <VFXProvider>
            <CyberBackground />
            <EventExplosion />
            <div className="flex flex-col min-h-screen relative z-10">
              {children}
            </div>
          </VFXProvider>
        </LatencyProvider>
      </body>
    </html>
  );
}

