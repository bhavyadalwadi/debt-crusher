import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DebtCrusherApp } from "@/components/debt-crusher-app";

export default async function HomePage() {
  const { userId } = await auth.protect();
  const ownerId = process.env.DEBT_CRUSHER_OWNER_CLERK_USER_ID?.trim();
  if (!ownerId || userId !== ownerId) notFound();

  return (
    <Suspense fallback={null}>
      <DebtCrusherApp />
    </Suspense>
  );
}
