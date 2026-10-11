import Link from "next/link";
import SignupForm from "@/components/SignupForm";

export default function Signup() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-navy">Create your account</h1>
        <p className="text-sm text-muted">Start drafting agreements with Mr. Legal.</p>
      </div>
      <SignupForm />
      <p className="text-sm text-muted">
        Already have an account? <Link href="/" className="font-medium text-primary">Sign in</Link>
      </p>
    </main>
  );
}
