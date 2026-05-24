import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
export const metadata: Metadata = { title: "GameCraft - AI游戏开发", description: "AI辅助游戏设计工作流" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 flex flex-col">
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50"><div className="max-w-6xl mx-auto px-4 h-14 flex items-center"><Link href="/" className="text-xl font-bold text-purple-600">🎮 GameCraft</Link></div></nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
