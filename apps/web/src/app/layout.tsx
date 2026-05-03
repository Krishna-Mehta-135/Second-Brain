import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

import { TooltipProvider, Toaster } from "@repo/ui";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import type { AuthState, Session } from "@/lib/auth/types";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Knowdex",
  description: "Your digital knowledge companion",
  icons: {
    icon: "/purple-atom-logo.svg",
    apple: "/purple-atom-logo.svg",
  },
};

const API_URL = process.env.API_URL || "http://127.0.0.1:9898";

async function getInitialAuthState(): Promise<AuthState> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return { status: "unauthenticated" };
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { status: "unauthenticated" };
    }

    const session = (await res.json()) as Session;
    return { status: "authenticated", session };
  } catch {
    return { status: "unauthenticated" };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialAuthState = await getInitialAuthState();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="font-sans antialiased bg-background text-foreground">
        <AuthProvider initialState={initialAuthState}>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
