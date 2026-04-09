import type { ReactNode } from "react";

import EmptyState from "@/components/ui/EmptyState";
import SkeletonTable from "@/components/ui/SkeletonTable";

type Column<T> = {
    key: keyof T | string;
    header: string;
    render?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
    columns: Column<T>[];
    rows: T[];
    loading?: boolean;
    emptyMessage: string;
    title?: string;
};

export default function DataTable<T extends { id?: number | string }>({
    columns,
    rows,
    loading = false,
    emptyMessage,
    title = "Table Data",
}: DataTableProps<T>) {
    if (loading) {
        return <SkeletonTable rows={4} columns={columns.length} />;
    }

    if (rows.length === 0) {
        return (
            <EmptyState title="No data available" description={emptyMessage} />
        );
    }

    return (
        <div className="ui-card ui-fade-in overflow-x-auto">
            <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700">{title}</div>
            <table className="min-w-full text-left text-sm text-zinc-700">
                <thead className="sticky top-0 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                        {columns.map((column) => (
                            <th key={String(column.key)} className="px-4 py-3 font-semibold">
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={row.id ?? rowIndex} className="border-t border-zinc-100 transition hover:bg-zinc-50/80">
                            {columns.map((column) => (
                                <td key={String(column.key)} className="px-4 py-3">
                                    {column.render ? column.render(row) : String((row as Record<string, unknown>)[String(column.key)] ?? "-")}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}