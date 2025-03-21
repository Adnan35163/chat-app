"use client";

import Link from "next/link";
import { FiMail } from "react-icons/fi";

export default function VerifyEmail() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md dark:bg-dark-bg">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-primary dark:bg-blue-900/30">
            <FiMail className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Check your email</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            We've sent you a verification link to your email address.
          </p>
        </div>

        <div className="mt-6 space-y-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please check your email and click on the verification link to
            complete your registration. If you don't see the email, check your
            spam folder.
          </p>

          <div className="pt-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-primary hover:text-blue-500"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
