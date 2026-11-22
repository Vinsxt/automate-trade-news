import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Global Trade Intelligence",
  description: "Evidence-backed trade monitoring and competitive intelligence.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
