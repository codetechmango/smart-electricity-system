export default function EmptyState({
    title,
    description,
    action,
    icon,
}: {
    title: string;
    description: string;
    action?: React.ReactNode;
    icon?: React.ReactNode;
}) {
    return (
        <div className="ui-card ui-fade-in border-dashed p-8 text-center">
            <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                {icon ?? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M8.5 11h7M8.5 14h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                )}
            </div>
            <h3 className="text-lg font-semibold text-zinc-800">{title}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">{description}</p>
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    );
}
