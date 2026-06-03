import { NextResponse } from "next/server";
import { getSessionCookieName, getSessionCookieOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/signin", request.url));
  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    ...getSessionCookieOptions(0),
  });
  return response;
}
