import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getSessionCookieName,
  hasPrivateAccessCredentials,
  isValidSessionToken,
  sanitizeNextPath,
} from "@/lib/auth";

function isPublicPath(pathname: string) {
  return (
    pathname === "/signin" ||
    pathname.startsWith("/api/auth/signin")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasCredentials = hasPrivateAccessCredentials();
  const isAuthed = hasCredentials
    ? await isValidSessionToken(
        request.cookies.get(getSessionCookieName())?.value,
      )
    : false;

  if (isPublicPath(pathname)) {
    if (pathname === "/signin" && hasCredentials && isAuthed) {
      const destination = sanitizeNextPath(
        request.nextUrl.searchParams.get("next"),
      );
      return NextResponse.redirect(new URL(destination, request.url));
    }

    return NextResponse.next();
  }

  if (!hasCredentials) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("next", sanitizeNextPath(`${pathname}${search}`));
    signInUrl.searchParams.set("error", "config");
    return NextResponse.redirect(signInUrl, 303);
  }

  if (!isAuthed) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("next", sanitizeNextPath(`${pathname}${search}`));
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
