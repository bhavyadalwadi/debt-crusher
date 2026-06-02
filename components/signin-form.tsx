"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError("");

    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password, next }),
        });

        const payload = (await response.json()) as { error?: string; next?: string };
        if (!response.ok) {
          setError(payload.error ?? "Sign-in failed.");
          return;
        }

        router.replace(payload.next || next || "/");
        router.refresh();
      } catch {
        setError("Sign-in failed.");
      }
    });
  }

  return (
    <form
      className="signin-form"
      action={handleSubmit}
    >
      <label className="signin-field">
        <span>Username</span>
        <input autoComplete="username" name="username" required type="text" />
      </label>
      <label className="signin-field">
        <span>Password</span>
        <input autoComplete="current-password" name="password" required type="password" />
      </label>
      {error ? <p className="signin-error">{error}</p> : null}
      <button className="primary-button signin-submit" disabled={isPending} type="submit">
        {isPending ? "Signing In..." : "Sign In"}
      </button>
    </form>
  );
}
