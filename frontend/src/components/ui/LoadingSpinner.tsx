type LoadingSpinnerProps = {
    label?: string;
    compact?: boolean;
    inline?: boolean;
};

export default function LoadingSpinner({ label = "Loading...", compact = false, inline = false }: LoadingSpinnerProps) {
    if (inline) {
        return (
            <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                <span>{label}</span>
            </span>
        );
    }

    return (
        <div
            className={`ui-fade-in flex items-center gap-3 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-600 ${compact ? "px-3 py-2" : "px-4 py-3"
                }`}
        >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
            <span>{label}</span>
        </div>
    );
}