type ChatMessageProps = {
    role: "user" | "bot" | "system";
    text: string;
    timestamp: string;
};

const roleStyles: Record<ChatMessageProps["role"], string> = {
    user: "ml-auto max-w-[85%] bg-zinc-900 text-white",
    bot: "mr-auto max-w-[90%] border border-zinc-200 bg-white text-zinc-800",
    system: "mr-auto max-w-[95%] border border-sky-200 bg-sky-50 text-sky-900",
};

const highlightValues = (text: string) => {
    return text.split(/(Rs\.\s?\d+(?:\.\d+)?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?\s?units?)/gi).map((part, idx) => {
        if (/^(Rs\.\s?\d+(?:\.\d+)?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?\s?units?)$/i.test(part)) {
            return (
                <span key={idx} className="font-semibold text-emerald-700">
                    {part}
                </span>
            );
        }
        return <span key={idx}>{part}</span>;
    });
};

export default function ChatMessage({ role, text, timestamp }: ChatMessageProps) {
    return (
        <div className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${roleStyles[role]}`}>
            <p className="leading-6">{highlightValues(text)}</p>
            <p className={`mt-1 text-[10px] ${role === "user" ? "text-zinc-300" : "text-zinc-500"}`}>{timestamp}</p>
        </div>
    );
}
