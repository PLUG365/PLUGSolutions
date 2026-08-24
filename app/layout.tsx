import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLUG Solutions — 解決策をつなぎ、現場を起動する。",
  description: "Power Platformを起点に、Web、モバイル、AI、OSSまで。現場で動いた工夫を見つけ、持ち帰り、次の実践へつなぐソリューションカタログ。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
