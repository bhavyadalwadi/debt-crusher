import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return <main className="signin-shell"><SignUp signInUrl="/sign-in" /></main>;
}
