type SkeletonCardProps = {
    className?: string;
};

export default function SkeletonCard({ className = "h-36" }: SkeletonCardProps) {
    return (
        <div className={`ui-card animate-pulse p-4 ${className}`}>
            <div className="h-4 w-1/3 rounded bg-zinc-200" />
            <div className="mt-4 h-8 w-1/2 rounded bg-zinc-200" />
            <div className="mt-3 h-3 w-2/3 rounded bg-zinc-100" />
        </div>
    );
}