"use client";

import { useEffect, useMemo, useState } from "react";

import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/context/ToastContext";
import { getAllAlerts, resolveAlert, toApiErrorMessage } from "@/services/api";
import type { Alert } from "@/types";

type AlertRow = {
    id: number;
    userId: number;
    message: string;
    explanation: string;
    timestamp: string;
    status: string;
};

export default function AdminAlertsPage() {
    const { pushToast } = useToast();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingAlertIds, setResolvingAlertIds] = useState<number[]>([]);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            setAlerts(await getAllAlerts());
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const onResolve = async (alertId: number) => {
        setResolvingAlertIds((prev) => [...prev, alertId]);
        try {
            await resolveAlert(alertId);
            setAlerts((prev) =>
                prev.map((alert) =>
                    alert.id === alertId
                        ? {
                            ...alert,
                            resolved: true,
                            status: "resolved",
                            resolved_at: new Date().toISOString(),
                        }
                        : alert,
                ),
            );
            pushToast({
                variant: "success",
                title: "Alert resolved",
                message: `Alert #${alertId} has been marked as resolved.`,
            });
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setResolvingAlertIds((prev) => prev.filter((id) => id !== alertId));
        }
    };

    const rows = useMemo<AlertRow[]>(
        () =>
            alerts.map((alert) => ({
                id: alert.id,
                userId: alert.user_id,
                message: alert.message,
                explanation:
                    alert.percentage_increase === null
                        ? `Insufficient data - ${alert.explanation}`
                        : `${alert.percentage_increase.toFixed(2)}% - ${alert.explanation}`,
                timestamp: new Date(alert.timestamp).toLocaleString(),
                status: alert.resolved ? "Resolved" : "Open",
            })),
        [alerts],
    );

    return (
        <section className="space-y-6">
            <PageHeader title="Alerts Management" description="Review anomaly alerts and mark them as resolved." />

            {error ? (
                <ErrorMessage
                    title="Unable to load alerts"
                    message={error || "We could not fetch alert data right now. Please retry."}
                />
            ) : null}

            {!loading && rows.length === 0 ? (
                <EmptyState title="No alerts found" description="All anomaly alerts are currently cleared." />
            ) : (
                <DataTable
                    title="All System Alerts"
                    rows={rows}
                    loading={loading}
                    emptyMessage="No alerts found"
                    columns={[
                        { key: "userId", header: "User ID" },
                        { key: "message", header: "Message" },
                        { key: "explanation", header: "Explanation" },
                        { key: "timestamp", header: "Timestamp" },
                        {
                            key: "status",
                            header: "Status",
                            render: (row) => (
                                <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "Open" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                        }`}
                                >
                                    {row.status}
                                </span>
                            ),
                        },
                        {
                            key: "action",
                            header: "Action",
                            render: (row) =>
                                row.status === "Open" ? (
                                    <button
                                        type="button"
                                        className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700"
                                        onClick={() => void onResolve(row.id)}
                                        disabled={resolvingAlertIds.includes(row.id)}
                                    >
                                        {resolvingAlertIds.includes(row.id) ? "Resolving..." : "Mark Resolved"}
                                    </button>
                                ) : (
                                    <span className="text-xs text-zinc-500">Done</span>
                                ),
                        },
                    ]}
                />
            )}
        </section>
    );
}
