"use client";

import { Suspense } from "react";
import { FormEvent, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { toApiErrorMessage } from "@/services/api";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const router = useRouter();
    const search = useSearchParams();

    const { login } = useAuth();
    const { pushToast } = useToast();

    const canSubmit = useMemo(() => email.trim().length > 4 && password.length >= 6, [email, password]);

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) {
            setError("Enter a valid email and password");
            return;
        }

        setSubmitting(true);
        setError("");
        try {
            const authenticatedUser = await login({ email, password });
            pushToast({
                variant: "success",
                title: "Welcome back",
                message: "You are now signed in.",
            });
            router.replace(search.get("redirect") || (authenticatedUser.role === "admin" ? "/admin" : "/dashboard"));
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="grid min-h-screen bg-[radial-gradient(circle_at_top,_#f0f9ff,_#e2e8f0_40%,_#f8fafc_100%)] p-4 md:p-8">
            <div className="m-auto w-full max-w-md rounded-3xl border border-white/80 bg-white/85 p-6 shadow-2xl backdrop-blur md:p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Smart Electricity Monitoring</p>
                <h1 className="mt-2 text-3xl font-bold text-zinc-900">Sign in to your portal</h1>
                <p className="mt-2 text-sm text-zinc-500">Sign in to monitor your electricity usage and insights.</p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <label className="block text-sm font-medium text-zinc-700">
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                            placeholder="you@example.com"
                            required
                        />
                    </label>

                    <label className="block text-sm font-medium text-zinc-700">
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                            placeholder="••••••••"
                            required
                        />
                    </label>

                    {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {submitting ? "Signing in..." : "Sign In"}
                    </button>

                    <p className="text-center text-xs text-zinc-500">Contact admin if you do not have an account.</p>
                </form>

                <p className="mt-5 text-sm text-zinc-600">
                    New here? <Link href="/register" className="font-semibold text-cyan-700 hover:text-cyan-900">Create account</Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_#f0f9ff,_#e2e8f0_40%,_#f8fafc_100%)]">
                    <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600">Loading login...</p>
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
