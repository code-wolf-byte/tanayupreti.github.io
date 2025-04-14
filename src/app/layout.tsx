import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider, ViewModeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tanay Upreti",
  description: "Personal website of Tanay Upreti",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ViewModeProvider>
            <div className="min-h-screen bg-background">
              <div className="fixed top-4 right-4 z-50">
                <ModeToggle />
              </div>
              {children}
            </div>
          </ViewModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
