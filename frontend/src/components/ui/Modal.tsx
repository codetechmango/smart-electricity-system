"use client";

export default function Modal({
    open,
    title,
    onClose,
    children,
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <button className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" onClick={onClose} type="button" aria-label="Close modal" />
            <div className="relative z-10 w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-start justify-between">
                    <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
                    <button
                        className="rounded-xl border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100"
                        onClick={onClose}
                        type="button"
                    >
                        Close
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
