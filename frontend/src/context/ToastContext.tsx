"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
    id: number;
    title: string;
    message?: string;
    variant: ToastVariant;
};

type ToastContextValue = {
    toasts: ToastItem[];
    pushToast: (toast: Omit<ToastItem, "id">) => void;
    dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const pushToast = useCallback((toast: Omit<ToastItem, "id">) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setToasts((prev) => [...prev, { ...toast, id }]);
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((item) => item.id !== id));
        }, 4200);
    }, []);

    const value = useMemo(
        () => ({
            toasts,
            pushToast,
            dismissToast,
        }),
        [dismissToast, pushToast, toasts],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-3">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${toast.variant === "success"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                : toast.variant === "error"
                                    ? "border-red-200 bg-red-50 text-red-900"
                                    : "border-sky-200 bg-sky-50 text-sky-900"
                            }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold">{toast.title}</p>
                                {toast.message ? <p className="mt-1 text-xs opacity-90">{toast.message}</p> : null}
                            </div>
                            <button
                                onClick={() => dismissToast(toast.id)}
                                className="text-xs font-semibold opacity-70 transition hover:opacity-100"
                                type="button"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return context;
}
