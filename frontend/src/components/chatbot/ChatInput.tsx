"use client";

import { FormEvent, useState } from "react";

export default function ChatInput({
    onSend,
    disabled,
}: {
    onSend: (value: string) => void;
    disabled?: boolean;
}) {
    const [value, setValue] = useState("");

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) {
            return;
        }
        onSend(trimmed);
        setValue("");
    };

    return (
        <form onSubmit={handleSubmit} className="border-t border-zinc-200 p-3">
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-2 py-2">
                <input
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="Ask about your bill, usage, alerts..."
                    className="w-full bg-transparent px-2 text-sm outline-none"
                    disabled={disabled}
                />
                <button
                    type="submit"
                    disabled={disabled}
                    className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Send
                </button>
            </div>
        </form>
    );
}
