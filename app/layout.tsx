import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ajaia Docs",
  description: "Lightweight collaborative document editor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 text-gray-900 antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
