"use client";

import { useId, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AppLoading } from "@/components/brand/app-loading";
import { LogoMark } from "@/components/brand/logo";
import { STORAGE } from "@/lib/brand";
import { Suspense } from "react";

function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mode === "login" ? { email, password } : { name, username, email, password }),
    });
    const body = (await response.json()) as { error?: string; user?: { name: string; username: string; orgRole?: "admin" | "member" } };
    setPending(false);
    if (!response.ok || !body.user) {
      setError(body.error ?? "Could not sign you in.");
      return;
    }
    localStorage.setItem(STORAGE.tech, JSON.stringify({ name: body.user.name, username: body.user.username }));
    const manager = body.user.orgRole === "admin";
    const asked = params.get("next");
    let destination = manager ? "/office" : "/field";
    if (asked?.startsWith("/field")) destination = asked;
    if (manager && asked?.startsWith("/office")) destination = asked;
    window.location.assign(destination);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-md">
        <div className="flex items-center gap-3">
          <LogoMark className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Meter<span className="text-brand">Vault</span>
            </h1>
            <p className="text-sm text-muted">Field capture and the manager dashboard are separate.</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 rounded-md bg-canvas p-1 text-sm font-semibold">
          <button type="button" onClick={() => { setMode("login"); setError(""); }} className={`min-h-10 rounded-md ${mode === "login" ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
            Log in
          </button>
          <button type="button" onClick={() => { setMode("signup"); setError(""); }} className={`min-h-10 rounded-md ${mode === "signup" ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
            Create account
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {mode === "signup" ? (
            <>
              <Field label="Your name" value={name} onChange={setName} autoComplete="name" />
              <Field label="Username" value={username} onChange={setUsername} autoComplete="username" />
            </>
          ) : null}
          <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            visible={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 8 : undefined}
          />
          {mode === "signup" ? (
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showPassword}
              onToggle={() => setShowPassword((current) => !current)}
              autoComplete="new-password"
              minLength={8}
            />
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
        <button type="submit" disabled={pending} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-base font-semibold text-on-primary disabled:opacity-60">
          {pending ? <ButtonSpinner /> : null}
          {pending ? "Please wait" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </main>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
  minLength?: number;
}) {
  const id = useId();
  return (
    <div className="space-y-1 text-sm font-semibold">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id}>{label}</label>
        <button type="button" onClick={onToggle} className="text-xs font-semibold text-brand" aria-controls={id}>
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <input
        id={id}
        required
        minLength={minLength}
        type={visible ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-md border border-line bg-canvas px-3 text-base font-normal"
      />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete: string }) {
  return (
    <label className="block space-y-1 text-sm font-semibold">
      {label}
      <input
        required
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-md border border-line bg-canvas px-3 text-base font-normal"
      />
    </label>
  );
}

function ButtonSpinner() {
  return (
    <svg className="mv-loader-ring h-5 w-5" viewBox="0 0 80 80" aria-hidden>
      <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="10" opacity="0.35" />
      <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeDasharray="46 150" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AppLoading full label="Opening MeterVault" />}>
      <LoginForm />
    </Suspense>
  );
}
