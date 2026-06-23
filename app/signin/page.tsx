import { SignInForm } from "@/components/signin-form";
import { hasPrivateAccessCredentials, sanitizeNextPath } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeNextPath(params.next);
  const missingAuthConfig =
    !hasPrivateAccessCredentials() || params.error === "config";

  return (
    <main className="signin-shell">
      <section className="signin-card">
        <p className="eyebrow">Private Access</p>
        <h1>Sign in to Debt Crusher</h1>
        <p className="subtle-copy">
          Use the shared private credentials configured for this app.
        </p>
        {missingAuthConfig ? (
          <p className="signin-error">
            Shared sign-in is not configured yet. Set
            {" `PRIVATE_ACCESS_USERNAME` and `PRIVATE_ACCESS_PASSWORD` in the active env file, then restart the app."}
          </p>
        ) : null}
        <SignInForm next={next} />
      </section>
    </main>
  );
}
