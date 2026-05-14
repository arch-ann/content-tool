import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Prompt Generator — Have Creative Agency",
  description: "Drop your media, pick a goal, get a ready-to-use content plan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
