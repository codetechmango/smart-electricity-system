"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function Topbar({
    title,
    onMenuClick,
}: {
    title: string;
    onMenuClick: () => void;
}) {
    const { user, logout } = useAuth();
    const { pushToast } = useToast();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        pushToast({
            variant: "info",
            title: "Signed out",
            message: "Your session has been closed.",
        });
        router.push("/login");
    };

    return (
        <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between px-4 md:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 transition hover:bg-zinc-100 lg:hidden"
                        onClick={onMenuClick}
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M3 6h18M3 12h18M3 18h18" />
                        </svg>
                    </button>
                    <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Smart Electricity Board</p>
                        <h1 className="text-sm font-semibold text-zinc-900 md:text-base">{title}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block">
                        <p className="text-sm font-semibold text-zinc-900">{user?.name}</p>
                        <p className="text-xs text-zinc-500">{user?.role?.toUpperCase()} · {user?.area}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}
