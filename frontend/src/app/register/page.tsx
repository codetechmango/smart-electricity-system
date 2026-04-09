"use client";

import { FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { toApiErrorMessage } from "@/services/api";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [area, setArea] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const { register } = useAuth();
    const { pushToast } = useToast();
    const router = useRouter();

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            await register({
                name,
                email,
                password,
                area,
                role: "user",
            });

            pushToast({
                variant: "success",
                title: "Registration successful",
                message: "Your account has been created.",
            });
            router.replace("/dashboard");
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="grid min-h-screen bg-[radial-gradient(circle_at_top,_#dcfce7,_#e2e8f0_38%,_#f8fafc_100%)] p-4 md:p-8">
            <div className="m-auto w-full max-w-lg rounded-3xl border border-white/80 bg-white/90 p-6 shadow-2xl backdrop-blur md:p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Customer Onboarding</p>
                <h1 className="mt-2 text-3xl font-bold text-zinc-900">Create your electricity account</h1>

                <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block text-sm font-medium text-zinc-700 md:col-span-2">
                        Full Name
                        <input
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            required
                        />
                    </label>

                    <label className="block text-sm font-medium text-zinc-700">
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            required
                        />
                    </label>

                    <label className="block text-sm font-medium text-zinc-700">
                        Area
                        <input
                            type="text"
                            value={area}
                            onChange={(event) => setArea(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            required
                        />
                    </label>

                    <label className="block text-sm font-medium text-zinc-700">
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            required
                        />
                    </label>

                    {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{error}</p> : null}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
                    >
                        {submitting ? "Creating account..." : "Create Account"}
                    </button>
                </form>

                <p className="mt-5 text-sm text-zinc-600">
                    Already have an account? <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-900">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
