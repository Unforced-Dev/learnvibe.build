import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Learn Vibe Build",
  description:
    "From curious to capable. Learn to build with AI through hands-on cohort courses.",
  openGraph: {
    title: "Learn Vibe Build",
    description:
      "From curious to capable. Learn to build with AI through hands-on cohort courses.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans text-gray-300 antialiased">{children}</body>
    </html>
  );
}
