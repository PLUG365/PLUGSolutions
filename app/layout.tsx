import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solution Commons — いい解決策は、持ち帰れる。",
  description: "個人開発アプリから Power Platform まで。見つけて、試して、持ち帰って育てるソリューションカタログ。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
