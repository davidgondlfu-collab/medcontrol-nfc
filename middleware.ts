import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/", "/medications", "/history", "/settings", "/link-tag"];
const authPaths = ["/login", "/register"];

/**
 * Refreshes and verifies the session only for routes that need a server-side
 * authentication decision. In particular, it deliberately excludes /nfc and
 * static assets: the NFC page authenticates in the browser and must not turn a
 * tag scan into an Edge-to-Auth round trip.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const needsProtectedSession = protectedPaths.includes(pathname);
  const needsAuthRedirect = authPaths.includes(pathname);
  const hasAuthCookie = request.cookies.getAll().some(({ name }) =>
    name.startsWith("sb-") && name.includes("-auth-token"),
  );

  // Anonymous requests never need to contact Supabase. This is the common
  // production path for the login page and a protected route's first visit.
  if (!hasAuthCookie) {
    if (needsProtectedSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims is the Supabase SSR-recommended validation method. Unlike
  // getUser, it does not call the Auth user endpoint on every request.
  const { data: claimsData } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(claimsData?.claims?.sub);

  if (!isAuthenticated && needsProtectedSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && needsAuthRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run only where a session affects routing. This avoids invoking Edge
  // middleware for PWA assets and /nfc, eliminating unnecessary timeouts.
  matcher: ["/", "/login", "/register", "/medications/:path*", "/history/:path*", "/settings/:path*", "/link-tag/:path*"],
};
