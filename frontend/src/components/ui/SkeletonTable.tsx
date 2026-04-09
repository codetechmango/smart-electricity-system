type SkeletonTableProps = {
    rows?: number;
    columns?: number;
};

export default function SkeletonTable({ rows = 4, columns = 5 }: SkeletonTableProps) {
    return (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                <div className="h-4 w-36 animate-pulse rounded bg-zinc-200" />
            </div>

            <div className="space-y-3 p-4">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                        {Array.from({ length: columns }).map((__, colIndex) => (
                            <div key={`${rowIndex}-${colIndex}`} className="h-4 animate-pulse rounded bg-zinc-200" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}