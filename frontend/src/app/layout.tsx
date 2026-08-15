import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Toaster } from "sonner";
import "./globals.css";

const systemFontVariables = {
  "--font-geist-sans": "Arial, Helvetica, sans-serif",
  "--font-geist-mono":
    '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
} as CSSProperties;

export const metadata: Metadata = {
  title: "PromptForge | AI 前端工作台",
  description: "用自然语言生成并预览 React 前端项目",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" style={systemFontVariables}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
