type AlertCardProps = {
    userId: number;
    message: string;
    explanation?: string;
    percentageIncrease?: number | null;
    severity: "high" | "medium" | "low";
    date: string;
};

const severityStyles: Record<AlertCardProps["severity"], string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-blue-100 text-blue-700",
};

export default function AlertCard({ userId, message, explanation, percentageIncrease = null, severity, date }: AlertCardProps) {
    const percentageLabel =
        percentageIncrease === null ? "Insufficient data" : `${percentageIncrease.toFixed(2)}%`;

    return (
        <article className="ui-card ui-fade-in p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs text-zinc-600">!</span>
                    User #{userId}
                </p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${severityStyles[severity]}`}>
                    {severity}
                </span>
            </div>
            <p className="text-sm leading-6 text-zinc-800">{message}</p>
            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <p className="text-xs font-semibold text-zinc-700">Percentage change: {percentageLabel}</p>
                <p className="mt-1 text-xs text-zinc-600">{explanation || "Insufficient data"}</p>
            </div>
            <p className="mt-3 text-xs text-zinc-400">{date}</p>
        </article>
    );
}