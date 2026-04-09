"use client";

import { useEffect, useState } from "react";

import AlertCard from "@/components/ui/AlertCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { getUserAlerts, toApiErrorMessage } from "@/services/api";
import type { Alert } from "@/types";

const severityFromType = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("high")) {
        return "high" as const;
    }
    if (normalized.includes("low")) {
        return "low" as const;
    }
    return "medium" as const;
};

export default function UserAlertsPage() {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const load = async () => {
            if (!user) {
                return;
            }

            setLoading(true);
            setError("");

            try {
                setAlerts(await getUserAlerts(user.id));
            } catch (err) {
                setError(toApiErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [user]);

    return (
        <section className="space-y-6">
            <PageHeader title="Alerts" description="Consumption anomaly notifications and smart recommendations." />

            {error ? (
                <ErrorMessage
                    title="Unable to load alerts"
                    message={error || "We could not fetch alerts right now. Please retry."}
                />
            ) : null}

            {loading ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, idx) => (
                        <div key={idx} className="h-36 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
                    ))}
                </div>
            ) : alerts.length === 0 ? (
                <EmptyState
                    title="No active alerts"
                    description="No unusual high consumption detected. Your account currently has a clean usage profile."
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {alerts.map((alert) => (
                        <AlertCard
                            key={alert.id}
                            userId={alert.user_id}
                            message={alert.message || "Anomaly detected"}
                            explanation={alert.explanation}
                            percentageIncrease={alert.percentage_increase}
                            severity={severityFromType(alert.type)}
                            date={new Date(alert.timestamp).toLocaleString()}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
