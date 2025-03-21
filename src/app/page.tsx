import Link from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/chat");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md dark:bg-dark-bg">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">Chat App</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Connect with friends in real-time
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Link
            href="/auth/login"
            className="flex w-full justify-center rounded-md bg-primary px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Log In
          </Link>
          <Link
            href="/auth/signup"
            className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
