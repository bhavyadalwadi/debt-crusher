import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <main className="signin-shell"><SignIn withSignUp={false} /></main>;
}
