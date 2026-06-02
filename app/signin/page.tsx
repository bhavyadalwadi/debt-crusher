import { SignInForm } from "@/components/signin-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next =
    typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/";

  return (
    <main className="signin-shell">
      <section className="signin-card">
        <p className="eyebrow">Private Access</p>
        <h1>Sign in to Debt Crusher</h1>
        <p className="subtle-copy">
          Use the shared private credentials configured for this app.
        </p>
        <SignInForm next={next} />
      </section>
    </main>
  );
}
