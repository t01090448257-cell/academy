import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SYA Academy",
  description: "SYA Academy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}