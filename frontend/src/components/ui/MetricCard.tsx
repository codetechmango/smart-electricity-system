export default function MetricCard({
    title,
    value,
    hint,
    icon,
}: {
    title: string;
    value: string | number;
    hint?: string;
    icon?: React.ReactNode;
}) {
    return (
        <article className="ui-card ui-fade-in rounded-3xl p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-zinc-500">{title}</p>
                {icon ? (
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                        {icon}
                    </span>
                ) : null}
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-zinc-900">{value}</p>
            {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
        </article>
    );
}
