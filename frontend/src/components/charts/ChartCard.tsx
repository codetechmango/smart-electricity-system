import type { ReactNode } from "react";

import EmptyState from "@/components/ui/EmptyState";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SkeletonCard from "@/components/ui/SkeletonCard";

type ChartCardProps = {
    title: string;
    subtitle: string;
    loading?: boolean;
    empty?: boolean;
    emptyMessage?: string;
    children: ReactNode;
};

export default function ChartCard({
    title,
    subtitle,
    loading = false,
    empty = false,
    emptyMessage = "No data available",
    children,
}: ChartCardProps) {
    return (
        <article className="ui-card ui-fade-in p-5">
            <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
            <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>

            <div className="mt-4 h-72">
                {loading ? (
                    <div className="space-y-3">
                        <LoadingSpinner label="Loading chart..." />
                        <SkeletonCard className="h-52" />
                    </div>
                ) : empty ? (
                    <div className="flex h-full items-center">
                        <EmptyState title="No data available" description={emptyMessage} />
                    </div>
                ) : (
                    children
                )}
            </div>
        </article>
    );
}