"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GoogleIcon from "@/components/icons/GoogleIcon";

type FormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignUp() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const password = watch("password");

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/auth/verify-email");
    } catch (error) {
      console.error("Error signing up:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md dark:bg-dark-bg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Create an Account</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Join our chat community
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/30">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
              })}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) =>
                  value === password || "Passwords do not match",
              })}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-primary px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </div>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500 dark:bg-dark-bg dark:text-gray-400">
              or
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <GoogleIcon />
          <span>{googleLoading ? "Connecting..." : "Sign up with Google"}</span>
        </button>

        <div className="mt-4 text-center text-sm">
          <p className="text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-primary hover:text-blue-500"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
