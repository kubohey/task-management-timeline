import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold">Task Management Timeline</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          個人利用のためのタスク管理ツールです。
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
