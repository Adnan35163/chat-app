import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chat App",
  description: "A realtime chat application built with Next.js and Supabase",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <body className={inter.className}>
        {session && (
          <header className="bg-white shadow-sm dark:bg-dark-bg">
            <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
              <Link href="/chat" className="text-xl font-bold text-primary">
                Chat App
              </Link>
              <nav>
                <ul className="flex space-x-4">
                  <li>
                    <Link
                      href="/chat"
                      className="text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary"
                    >
                      Chat
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/profile"
                      className="text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary"
                    >
                      Profile
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </header>
        )}
        <main className="min-h-screen bg-background dark:bg-dark-bg">
          {children}
        </main>
      </body>
    </html>
  );
}
