import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border p-6 shadow-sm">
        <Image
          src="/logo.png"
          alt="Task Management Timeline"
          width={1448}
          height={1086}
          priority
          className="mb-3 h-12 w-auto"
        />
        <p className="mb-6 text-sm text-muted-foreground">
          個人利用のためのタスク管理ツールです。
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
