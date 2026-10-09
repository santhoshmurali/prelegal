import LoginForm from "@/components/LoginForm";

export default function Login() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-[#032147]">Prelegal</h1>
        <p className="text-sm text-[#888888]">Sign in to draft your agreements.</p>
      </div>
      <LoginForm />
    </main>
  );
}
