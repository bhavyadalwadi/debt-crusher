import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionCookieName, isValidSessionToken } from "@/lib/auth";

function isPublicPath(pathname: string) {
  return (
    pathname === "/signin" ||
    pathname.startsWith("/api/auth/signin")
  );
}

export async function middleware(request: NextRequest) {
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    return new NextResponse("Missing BASIC_AUTH_USERNAME or BASIC_AUTH_PASSWORD", {
      status: 500,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  const { pathname, search } = request.nextUrl;
  const isAuthed = await isValidSessionToken(
    request.cookies.get(getSessionCookieName())?.value,
  );

  if (isPublicPath(pathname)) {
    if (pathname === "/signin" && isAuthed) {
      const nextParam = request.nextUrl.searchParams.get("next");
      const destination = nextParam?.startsWith("/") ? nextParam : "/";
      return NextResponse.redirect(new URL(destination, request.url));
    }

    return NextResponse.next();
  }

  if (!isAuthed) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
