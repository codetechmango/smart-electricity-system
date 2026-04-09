"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";

import ChartCard from "@/components/charts/ChartCard";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import SkeletonCard from "@/components/ui/SkeletonCard";
import { useAuth } from "@/context/AuthContext";
import { getAllReadings, getUserDashboard, getUsers, toApiErrorMessage } from "@/services/api";
import type { AppUser, Reading } from "@/types";

type AiInsight = {
    id: string;
    message: string;
    action: string;
    savings: number;
};

const ENERGY_RATE = 6.8;

const toMonth = (date: string) =>
    new Date(date).toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
    });

const toDay = (date: string) =>
    new Date(date).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
    });

const monthKey = (date: string) => {
    const parsed = new Date(date);
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};

export default function UserDashboardPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [payload, setPayload] = useState<Awaited<ReturnType<typeof getUserDashboard>> | null>(null);
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [allReadings, setAllReadings] = useState<Reading[]>([]);

    const loadDashboard = useCallback(async () => {
        if (!user) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            const [data, usersData, readingsData] = await Promise.all([
                getUserDashboard(user.id),
                getUsers(),
                getAllReadings(),
            ]);
            setPayload(data);
            setAllUsers(usersData);
            setAllReadings(readingsData);
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const monthlyUsage = useMemo(() => {
        const readings = payload?.readings ?? [];
        const grouped = readings.reduce<Record<string, number>>((acc, reading) => {
            const key = toMonth(reading.timestamp);
            acc[key] = (acc[key] ?? 0) + Number(reading.units || 0);
            return acc;
        }, {});

        return Object.entries(grouped).map(([month, units]) => ({ month, units: Number(units.toFixed(2)) }));
    }, [payload?.readings]);

    const dailyUsage = useMemo(() => {
        const readings = [...(payload?.readings ?? [])]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-14);

        return readings.map((reading: Reading) => ({
            day: toDay(reading.timestamp),
            units: Number(reading.units || 0),
        }));
    }, [payload?.readings]);

    const aiInsights = useMemo<AiInsight[]>(() => {
        const readings = [...(payload?.readings ?? [])].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        if (readings.length < 2) {
            return [];
        }

        const insights: AiInsight[] = [];

        const monthlyBuckets = readings.reduce<Record<string, number>>((acc, reading) => {
            const key = monthKey(reading.timestamp);
            acc[key] = (acc[key] ?? 0) + Number(reading.units || 0);
            return acc;
        }, {});

        const monthSeries = Object.entries(monthlyBuckets)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, units]) => ({ key, units }));

        if (monthSeries.length >= 2) {
            const current = monthSeries[monthSeries.length - 1].units;
            const previous = monthSeries[monthSeries.length - 2].units;

            if (previous > 0) {
                const increasePct = ((current - previous) / previous) * 100;
                if (increasePct >= 25) {
                    const reducibleUnits = Math.max(0, current - previous) * 0.4;
                    insights.push({
                        id: "sudden-spike",
                        message: `Your usage increased by ${increasePct.toFixed(0)}% compared to last month.`,
                        action: "Run AC at 1°C higher and reduce daily use by around 1 hour.",
                        savings: Math.round(reducibleUnits * ENERGY_RATE),
                    });
                }
            }
        }

        const monthlyAverage = monthSeries.reduce((sum, item) => sum + item.units, 0) / monthSeries.length;
        if (monthlyAverage >= 300) {
            const reducibleUnits = monthlyAverage * 0.1;
            insights.push({
                id: "high-average",
                message: `Your average monthly usage is ${monthlyAverage.toFixed(0)} units, which is on the higher side.`,
                action: "Switch to energy-saving appliances and reduce standby device usage.",
                savings: Math.round(reducibleUnits * ENERGY_RATE),
            });
        }

        if (readings.length >= 6) {
            const latest = Number(readings[readings.length - 1].units || 0);
            const previousFive = readings.slice(-6, -1);
            const previousAverage = previousFive.reduce((sum, item) => sum + Number(item.units || 0), 0) / previousFive.length;

            if (previousAverage > 0) {
                const changePct = ((latest - previousAverage) / previousAverage) * 100;
                if (changePct >= 20) {
                    const reducibleUnits = Math.max(0, latest - previousAverage) * 0.5;
                    insights.push({
                        id: "unusual-increase",
                        message: `Recent reading shows an unusual ${changePct.toFixed(0)}% increase over your normal pattern.`,
                        action: "Check for inefficient appliances or unusual meter-connected load.",
                        savings: Math.round(reducibleUnits * ENERGY_RATE),
                    });
                }
            }
        }

        const totalUnits = readings.reduce((sum, item) => sum + Number(item.units || 0), 0);
        const nightUnits = readings
            .filter((item) => {
                const hour = new Date(item.timestamp).getHours();
                return hour >= 22 || hour < 6;
            })
            .reduce((sum, item) => sum + Number(item.units || 0), 0);

        if (totalUnits > 0) {
            const nightShare = (nightUnits / totalUnits) * 100;
            if (nightShare >= 35) {
                const reducibleUnits = nightUnits * 0.15;
                insights.push({
                    id: "night-usage",
                    message: `Your night-time usage is ${nightShare.toFixed(0)}% of total consumption, higher than normal.`,
                    action: "Schedule heavy appliances earlier and avoid overnight standby usage.",
                    savings: Math.round(reducibleUnits * ENERGY_RATE),
                });
            }
        }

        return insights.slice(0, 3);
    }, [payload?.readings]);

    const comparison = useMemo(() => {
        const readings = payload?.readings ?? [];
        const grouped = readings.reduce<Record<string, number>>((acc, reading) => {
            const key = monthKey(reading.timestamp);
            acc[key] = (acc[key] ?? 0) + Number(reading.units || 0);
            return acc;
        }, {});

        const now = new Date();
        const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

        const sameMonthLastYearDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        const sameMonthLastYearKey = `${sameMonthLastYearDate.getFullYear()}-${String(sameMonthLastYearDate.getMonth() + 1).padStart(2, "0")}`;

        const currentMonthUsage = Number(grouped[currentKey] ?? payload?.currentMonthUsage ?? 0);
        const lastMonthUsage = Number(grouped[lastMonthKey] ?? 0);

        const rawSameMonthLastYear = grouped[sameMonthLastYearKey];
        const sameMonthLastYearUsage =
            typeof rawSameMonthLastYear === "number"
                ? Number(rawSameMonthLastYear)
                : Math.max(0, Number((lastMonthUsage || currentMonthUsage * 0.92).toFixed(2)));
        const isSameMonthLastYearMocked = typeof rawSameMonthLastYear !== "number";

        const percentageChange =
            lastMonthUsage > 0 ? ((currentMonthUsage - lastMonthUsage) / lastMonthUsage) * 100 : 0;

        const costDifference = (currentMonthUsage - lastMonthUsage) * ENERGY_RATE;
        const comparisonChartData = [
            { month: "Last Month", units: Number(lastMonthUsage.toFixed(2)) },
            { month: "Current Month", units: Number(currentMonthUsage.toFixed(2)) },
            { month: "Same Month Last Year", units: Number(sameMonthLastYearUsage.toFixed(2)) },
        ];

        return {
            currentMonthUsage,
            lastMonthUsage,
            sameMonthLastYearUsage,
            isSameMonthLastYearMocked,
            percentageChange,
            costDifference,
            comparisonChartData,
        };
    }, [payload?.currentMonthUsage, payload?.readings]);

    const prediction = useMemo(() => {
        const readings = payload?.readings ?? [];
        const grouped = readings.reduce<Record<string, number>>((acc, reading) => {
            const key = monthKey(reading.timestamp);
            acc[key] = (acc[key] ?? 0) + Number(reading.units || 0);
            return acc;
        }, {});

        const monthSeries = Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, units]) => Number(units));

        const sampleSize = Math.min(3, monthSeries.length);
        const fallbackUnits = Number(payload?.currentMonthUsage ?? 0);

        const predictedUnits =
            sampleSize > 0
                ? monthSeries.slice(-sampleSize).reduce((sum, units) => sum + units, 0) / sampleSize
                : fallbackUnits;

        return {
            predictedUnits: Number(predictedUnits.toFixed(2)),
            predictedCost: Number((predictedUnits * ENERGY_RATE).toFixed(2)),
            sampleSize,
        };
    }, [payload?.currentMonthUsage, payload?.readings]);

    const areaIntelligence = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const userCurrentMonthUsage = Number(payload?.currentMonthUsage ?? 0);
        const areaUsers = allUsers.filter((item) => item.area === user?.area && item.role === "user");
        const areaUserIds = areaUsers.map((item) => item.id);

        const scopedUserIds = areaUserIds.length > 0 && user ? areaUserIds : user ? [user.id] : [];
        const areaMonthlyUsage = scopedUserIds.map((userId) => {
            return allReadings
                .filter((reading) => {
                    const readingDate = new Date(reading.timestamp);
                    return (
                        Number(reading.user_id) === Number(userId) &&
                        readingDate.getMonth() === currentMonth &&
                        readingDate.getFullYear() === currentYear
                    );
                })
                .reduce((sum, item) => sum + Number(item.units || 0), 0);
        });

        const areaAverageUsage =
            areaMonthlyUsage.length > 0
                ? areaMonthlyUsage.reduce((sum, value) => sum + value, 0) / areaMonthlyUsage.length
                : userCurrentMonthUsage;

        const usersWithLowerUsage = areaMonthlyUsage.filter((value) => value < userCurrentMonthUsage).length;
        const areaPercentile =
            areaMonthlyUsage.length > 0 ? (usersWithLowerUsage / areaMonthlyUsage.length) * 100 : 50;

        const areaComparisonText =
            areaPercentile >= 50
                ? `You consume more than ${areaPercentile.toFixed(0)}% users in your area.`
                : `You consume less than ${(100 - areaPercentile).toFixed(0)}% users in your area.`;

        const hourBuckets = (payload?.readings ?? []).reduce<Record<number, number>>((acc, reading) => {
            const hour = new Date(reading.timestamp).getHours();
            acc[hour] = (acc[hour] ?? 0) + Number(reading.units || 0);
            return acc;
        }, {});

        let peakHour = 19;
        const bucketEntries = Object.entries(hourBuckets);
        if (bucketEntries.length > 0) {
            peakHour = Number(
                bucketEntries.reduce((highest, current) => (Number(current[1]) > Number(highest[1]) ? current : highest))[0],
            );
        }

        const hour12 = peakHour % 12 || 12;
        const meridiem = peakHour >= 12 ? "PM" : "AM";
        const peakUsageText = `Your peak usage is around ${hour12}:00 ${meridiem}.`;

        const usageRatio = areaAverageUsage > 0 ? userCurrentMonthUsage / areaAverageUsage : 1;
        const upwardPenalty = comparison.percentageChange > 0 ? comparison.percentageChange * 0.5 : 0;
        const relativePenalty = Math.max(0, (usageRatio - 1) * 60);
        const relativeBonus = Math.max(0, (1 - usageRatio) * 20);
        const rawScore = 100 - relativePenalty - upwardPenalty + relativeBonus;
        const efficiencyScore = Math.max(0, Math.min(100, Math.round(rawScore)));

        return {
            areaComparisonText,
            peakUsageText,
            efficiencyScore,
            areaAverageUsage: Number(areaAverageUsage.toFixed(2)),
        };
    }, [allReadings, allUsers, comparison.percentageChange, payload?.currentMonthUsage, payload?.readings, user]);

    return (
        <section className="space-y-6">
            <PageHeader
                title="User Dashboard"
                description="Track your electricity consumption, current month usage, and latest bill summary."
                action={
                    <button
                        onClick={() => void loadDashboard()}
                        type="button"
                        className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
                    >
                        Refresh
                    </button>
                }
            />

            {error ? (
                <ErrorMessage
                    title="Unable to load dashboard"
                    message={error || "We could not fetch your usage data right now. Please try again in a moment."}
                />
            ) : null}

            {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <SkeletonCard key={idx} className="h-32" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <MetricCard
                        title="Total Units Consumed"
                        value={Number(payload?.totalUnits ?? 0).toFixed(2)}
                        hint="Lifetime usage"
                        icon={<span aria-hidden="true">kWh</span>}
                    />
                    <MetricCard
                        title="Current Month Usage"
                        value={Number(payload?.currentMonthUsage ?? 0).toFixed(2)}
                        hint="This billing cycle"
                        icon={<span aria-hidden="true">M</span>}
                    />
                    <MetricCard
                        title="Last Bill Amount"
                        value={`Rs. ${Number(payload?.lastBillAmount ?? 0).toFixed(2)}`}
                        hint="Most recent generated bill"
                        icon={<span aria-hidden="true">Rs</span>}
                    />
                </div>
            )}

            <article className="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900">Usage Prediction</h2>
                <p className="mt-1 text-sm text-zinc-600">Estimated next bill using moving average of recent monthly usage.</p>

                {loading ? (
                    <div className="mt-4">
                        <SkeletonCard className="h-24" />
                    </div>
                ) : (
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-sky-200 bg-white/80 p-4 md:col-span-2">
                            <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Estimated Next Bill</p>
                            <p className="mt-2 text-3xl font-bold text-sky-700">Rs. {prediction.predictedCost.toFixed(2)}</p>
                            <p className="mt-1 text-xs text-zinc-500">Based on {prediction.sampleSize || 1} recent month{prediction.sampleSize === 1 ? "" : "s"}.</p>
                        </div>

                        <div className="rounded-2xl border border-sky-200 bg-white/80 p-4">
                            <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Predicted Units</p>
                            <p className="mt-2 text-2xl font-bold text-zinc-900">{prediction.predictedUnits.toFixed(2)}</p>
                            <p className="mt-1 text-xs text-zinc-500">Projected monthly consumption</p>
                        </div>
                    </div>
                )}
            </article>

            <article className="rounded-3xl border border-zinc-200 bg-white/90 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900">Energy Efficiency Score</h2>
                <p className="mt-1 text-sm text-zinc-500">Real-world intelligence based on area comparison and your usage trend.</p>

                {loading ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {Array.from({ length: 2 }).map((_, idx) => (
                            <SkeletonCard key={idx} className="h-28" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-sm font-medium text-zinc-700">Efficiency Score</p>
                                <p className="text-lg font-bold text-zinc-900">{areaIntelligence.efficiencyScore}/100</p>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${areaIntelligence.efficiencyScore >= 75
                                        ? "bg-emerald-500"
                                        : areaIntelligence.efficiencyScore >= 50
                                            ? "bg-amber-500"
                                            : "bg-rose-500"
                                        }`}
                                    style={{ width: `${areaIntelligence.efficiencyScore}%` }}
                                />
                            </div>
                            <p className="mt-2 text-xs text-zinc-500">
                                Area average this month: {areaIntelligence.areaAverageUsage.toFixed(2)} units.
                            </p>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Area Comparison</p>
                                <p className="mt-2 text-sm font-medium text-zinc-800">{areaIntelligence.areaComparisonText}</p>
                            </div>

                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Peak Usage Detection</p>
                                <p className="mt-2 text-sm font-medium text-zinc-800">{areaIntelligence.peakUsageText}</p>
                            </div>
                        </div>
                    </>
                )}
            </article>

            <article className="rounded-3xl border border-zinc-200 bg-white/90 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900">Historical Comparison</h2>
                <p className="mt-1 text-sm text-zinc-500">Month-over-month and year-over-year usage view.</p>

                {loading ? (
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <SkeletonCard key={idx} className="h-28" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Current Month Usage</p>
                                <p className="mt-2 text-2xl font-bold text-zinc-900">{comparison.currentMonthUsage.toFixed(2)} units</p>
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Last Month Usage</p>
                                <p className="mt-2 text-2xl font-bold text-zinc-900">{comparison.lastMonthUsage.toFixed(2)} units</p>
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Same Month Last Year</p>
                                <p className="mt-2 text-2xl font-bold text-zinc-900">{comparison.sameMonthLastYearUsage.toFixed(2)} units</p>
                                {comparison.isSameMonthLastYearMocked ? (
                                    <p className="mt-1 text-xs text-zinc-500">Estimated from available usage history</p>
                                ) : null}
                            </div>
                        </div>

                        <div
                            className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${comparison.percentageChange <= 0
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-red-200 bg-red-50 text-red-700"
                                }`}
                        >
                            {comparison.percentageChange <= 0
                                ? `Usage decreased by ${Math.abs(comparison.percentageChange).toFixed(1)}% compared to last month.`
                                : `Usage increased by ${comparison.percentageChange.toFixed(1)}% compared to last month.`}
                        </div>

                        <div
                            className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${comparison.costDifference <= 0
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-red-200 bg-red-50 text-red-700"
                                }`}
                        >
                            {comparison.costDifference <= 0
                                ? `You saved Rs. ${Math.abs(comparison.costDifference).toFixed(2)} compared to last month.`
                                : `You spent Rs. ${Math.abs(comparison.costDifference).toFixed(2)} more than last month.`}
                        </div>
                    </>
                )}
            </article>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <ChartCard
                    title="Monthly Usage Trend"
                    subtitle="Unit consumption by month"
                    loading={loading}
                    empty={!loading && monthlyUsage.length === 0}
                    emptyMessage="No monthly usage data available yet."
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyUsage}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="units" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                    title="Daily Usage"
                    subtitle="Latest reading values"
                    loading={loading}
                    empty={!loading && dailyUsage.length === 0}
                    emptyMessage="No daily reading data available yet."
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyUsage}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="units" fill="#0891b2" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <ChartCard
                title="Monthly Usage Comparison"
                subtitle="Current month vs last month vs same month last year"
                loading={loading}
                empty={!loading && comparison.comparisonChartData.length === 0}
                emptyMessage="Not enough data for monthly comparison."
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparison.comparisonChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="units" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            <article className="rounded-3xl border border-zinc-200 bg-white/90 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900">AI Insights</h2>
                <p className="mt-1 text-sm text-zinc-500">Smart advisor based on your recent electricity usage pattern.</p>

                {loading ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {Array.from({ length: 2 }).map((_, idx) => (
                            <SkeletonCard key={idx} className="h-32" />
                        ))}
                    </div>
                ) : aiInsights.length === 0 ? (
                    <div className="mt-4">
                        <EmptyState
                            title="No data available"
                            description="No significant anomalies detected. Your usage trend looks stable this cycle."
                        />
                    </div>
                ) : (
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {aiInsights.map((insight) => (
                            <div key={insight.id} className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
                                <p className="text-sm font-semibold text-zinc-900">{insight.message}</p>
                                <p className="mt-2 text-sm text-zinc-700">Suggested action: {insight.action}</p>
                                <p className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                    Estimated savings: Rs. {insight.savings}/month
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </article>
        </section>
    );
}
