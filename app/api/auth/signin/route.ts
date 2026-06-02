import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieName,
  isValidLogin,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      next?: string;
    };

    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";
    const next =
      typeof body.next === "string" && body.next.startsWith("/") ? body.next : "/";

    if (!(await isValidLogin(username, password))) {
      return NextResponse.json(
        { error: "Incorrect username or password." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true, next });
    response.cookies.set({
      name: getSessionCookieName(),
      value: await createSessionToken(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-in failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
