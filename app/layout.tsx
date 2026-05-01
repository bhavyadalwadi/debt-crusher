import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Debt Crusher Dashboard",
  description: "Local debt payoff dashboard driven by workbook imports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
