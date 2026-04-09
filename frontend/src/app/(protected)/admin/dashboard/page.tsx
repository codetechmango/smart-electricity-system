"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import ChartCard from "@/components/charts/ChartCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import MetricCard from "@/components/ui/MetricCard";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import SkeletonCard from "@/components/ui/SkeletonCard";
import { useToast } from "@/context/ToastContext";
import { generateDemoData, getAllAlerts, getAllReadings, getDashboardData, getUsers, resetDemoSystem, toApiErrorMessage } from "@/services/api";
import type { AppUser, Reading } from "@/types";

export default function AdminDashboardPage() {
    const router = useRouter();
    const { pushToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isResettingSystem, setIsResettingSystem] = useState(false);
    const [isGeneratingDemoData, setIsGeneratingDemoData] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalUsage: 0,
        activeAlerts: 0,
        totalReadings: 0,
    });
    const [users, setUsers] = useState<AppUser[]>([]);
    const [readings, setReadings] = useState<Reading[]>([]);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const [dashboard, usersData, readingsData, alerts] = await Promise.all([
                getDashboardData(),
                getUsers(),
                getAllReadings(),
                getAllAlerts(),
            ]);

            setStats({
                totalUsers: Number(dashboard.total_users ?? usersData.length),
                totalUsage: Number(dashboard.total_units ?? 0),
                activeAlerts: Number(dashboard.active_alerts ?? alerts.filter((item) => !item.resolved).length),
                totalReadings: Number(dashboard.total_readings ?? readingsData.length),
            });
            setUsers(usersData);
            setReadings(readingsData);
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const onConfirmResetSystem = async () => {
        setIsResettingSystem(true);
        try {
            const result = await resetDemoSystem();
            pushToast({
                variant: "success",
                title: "Demo data reset",
                message: result.message,
            });
            setIsResetModalOpen(false);
            router.replace("/admin/dashboard");
            await load();
        } catch (err) {
            pushToast({
                variant: "error",
                title: "Failed to reset demo data",
                message: toApiErrorMessage(err),
            });
        } finally {
            setIsResettingSystem(false);
        }
    };

    const onGenerateDemoData = async () => {
        setIsGeneratingDemoData(true);
        try {
            const result = await generateDemoData();
            pushToast({
                variant: "success",
                title: "Demo data generated",
                message: result.message,
            });
            await load();
        } catch (err) {
            pushToast({
                variant: "error",
                title: "Failed to generate demo data",
                message: toApiErrorMessage(err),
            });
        } finally {
            setIsGeneratingDemoData(false);
        }
    };

    const areaWiseUsage = useMemo(() => {
        const usersById = new Map(users.map((user) => [user.id, user]));
        const grouped = readings.reduce<Record<string, number>>((acc, reading) => {
            const area = usersById.get(reading.user_id)?.area ?? "Unknown";
            acc[area] = (acc[area] ?? 0) + Number(reading.units || 0);
            return acc;
        }, {});

        return Object.entries(grouped)
            .map(([area, units]) => ({ area, units: Number(units.toFixed(2)) }))
            .sort((a, b) => b.units - a.units)
            .slice(0, 8);
    }, [readings, users]);

    const systemTrend = useMemo(() => {
        const grouped = readings.reduce<Record<string, number>>((acc, reading) => {
            const key = new Date(reading.timestamp).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
            acc[key] = (acc[key] ?? 0) + Number(reading.units || 0);
            return acc;
        }, {});

        return Object.entries(grouped).map(([month, units]) => ({ month, units: Number(units.toFixed(2)) }));
    }, [readings]);

    return (
        <section className="space-y-6">
            <PageHeader
                title="Admin Dashboard"
                description="System-level visibility for users, usage, alerts, and area-wise trends."
                action={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => void onGenerateDemoData()}
                            type="button"
                            disabled={isGeneratingDemoData}
                            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isGeneratingDemoData ? <LoadingSpinner inline label="Generating..." /> : "Generate Demo Data"}
                        </button>
                        <button
                            onClick={() => setIsResetModalOpen(true)}
                            type="button"
                            className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                            Reset Demo Data
                        </button>
                        <button
                            onClick={() => void load()}
                            type="button"
                            className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
                        >
                            Refresh
                        </button>
                    </div>
                }
            />

            {error ? (
                <ErrorMessage
                    title="Unable to load admin dashboard"
                    message={error || "We could not fetch admin metrics right now. Please retry."}
                />
            ) : null}

            {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <SkeletonCard key={idx} className="h-32" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Total Users" value={stats.totalUsers} hint="Registered accounts" icon={<span aria-hidden="true">U</span>} />
                    <MetricCard
                        title="Total Electricity Usage"
                        value={`${stats.totalUsage.toFixed(2)} Units`}
                        hint="System cumulative"
                        icon={<span aria-hidden="true">kWh</span>}
                    />
                    <MetricCard title="Active Alerts" value={stats.activeAlerts} hint="Open anomalies" icon={<span aria-hidden="true">!</span>} />
                    <MetricCard title="Readings Captured" value={stats.totalReadings} hint="Meter submissions" icon={<span aria-hidden="true">R</span>} />
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <ChartCard
                    title="Area-wise Usage"
                    subtitle="Top service areas by electricity usage"
                    loading={loading}
                    empty={!loading && areaWiseUsage.length === 0}
                    emptyMessage="No area usage data available."
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={areaWiseUsage}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="area" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="units" fill="#0284c7" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                    title="System Consumption Trend"
                    subtitle="Month-over-month usage"
                    loading={loading}
                    empty={!loading && systemTrend.length === 0}
                    emptyMessage="No trend data available."
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={systemTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="units" stroke="#0e7490" strokeWidth={2.5} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {!loading && readings.length === 0 ? (
                <EmptyState
                    title="No data available"
                    description="No readings, bills, or alerts exist right now. Generate demo data to repopulate the system."
                />
            ) : null}

            <Modal open={isResetModalOpen} title="Reset Demo Data?" onClose={() => !isResettingSystem && setIsResetModalOpen(false)}>
                <div className="space-y-4">
                    <p className="text-sm text-zinc-700">
                        This will erase all readings, bills, and alerts. Continue?
                    </p>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsResetModalOpen(false)}
                            disabled={isResettingSystem}
                            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void onConfirmResetSystem()}
                            disabled={isResettingSystem}
                            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isResettingSystem ? <LoadingSpinner inline label="Resetting..." /> : "Yes, reset demo data"}
                        </button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
