import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  try {
    // Refresh session if expired - required for Server Components
    await supabase.auth.getSession();
  } catch (error) {
    console.error("Error in auth middleware:", error);
    // Continue with the request even if there's an auth error
    // This prevents authentication issues from blocking the entire application
  }

  return res;
}
