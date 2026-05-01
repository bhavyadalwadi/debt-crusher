import { Suspense } from "react";
import { DebtCrusherApp } from "@/components/debt-crusher-app";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <DebtCrusherApp />
    </Suspense>
  );
}
