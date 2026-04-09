"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import DataTable from "@/components/ui/DataTable";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/context/ToastContext";
import { addMeterReading, getAllReadings, toApiErrorMessage } from "@/services/api";
import type { Reading } from "@/types";

type ReadingRow = {
    id: number;
    userId: number;
    date: string;
    units: string;
    currentValue: string;
    anomaly: string;
};

export default function AdminReadingsPage() {
    const { pushToast } = useToast();

    const [readings, setReadings] = useState<Reading[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [userId, setUserId] = useState("");
    const [previous, setPrevious] = useState("");
    const [current, setCurrent] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            setReadings(await getAllReadings());
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const userIdNum = Number(userId);
        const previousNum = Number(previous);
        const currentNum = Number(current);

        if (!userIdNum || currentNum < previousNum) {
            setError("Enter valid values. Current reading must be greater than previous reading.");
            return;
        }

        setSubmitting(true);
        setError("");
        try {
            await addMeterReading({
                user_id: userIdNum,
                previous_reading: previousNum,
                current_reading: currentNum,
            });
            pushToast({
                variant: "success",
                title: "Reading added",
                message: `Meter reading for user #${userIdNum} has been saved.`,
            });
            setUserId("");
            setPrevious("");
            setCurrent("");
            setOpen(false);
            await load();
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    const rows = useMemo<ReadingRow[]>(
        () =>
            readings.map((item) => ({
                id: item.id,
                userId: item.user_id,
                date: new Date(item.timestamp).toLocaleString(),
                units: Number(item.units).toFixed(2),
                currentValue: Number(item.load_value).toFixed(2),
                anomaly: item.is_anomaly ? "Yes" : "No",
            })),
        [readings],
    );

    return (
        <section className="space-y-6">
            <PageHeader
                title="Meter Readings"
                description="Capture meter readings and review all submitted records."
                action={
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
                    >
                        Add Reading
                    </button>
                }
            />

            {error ? (
                <ErrorMessage
                    title="Unable to load meter readings"
                    message={error || "We could not fetch readings right now. Please retry."}
                />
            ) : null}

            <DataTable
                title="All Meter Readings"
                rows={rows}
                loading={loading}
                emptyMessage="No readings found"
                columns={[
                    { key: "userId", header: "User ID" },
                    { key: "date", header: "Date" },
                    { key: "units", header: "Units" },
                    { key: "currentValue", header: "Current Reading" },
                    {
                        key: "anomaly",
                        header: "Anomaly",
                        render: (row) => (
                            <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.anomaly === "Yes" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                    }`}
                            >
                                {row.anomaly}
                            </span>
                        ),
                    },
                ]}
            />

            <Modal open={open} title="Add Meter Reading" onClose={() => setOpen(false)}>
                <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="text-sm font-medium text-zinc-700">
                        User ID
                        <input
                            type="number"
                            value={userId}
                            onChange={(event) => setUserId(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                            required
                        />
                    </label>
                    <label className="text-sm font-medium text-zinc-700">
                        Previous Reading
                        <input
                            type="number"
                            value={previous}
                            onChange={(event) => setPrevious(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                            required
                        />
                    </label>
                    <label className="text-sm font-medium text-zinc-700 md:col-span-2">
                        Current Reading
                        <input
                            type="number"
                            value={current}
                            onChange={(event) => setCurrent(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                            required
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-70 md:col-span-2"
                    >
                        {submitting ? <LoadingSpinner inline label="Saving..." /> : "Save Reading"}
                    </button>
                </form>
            </Modal>
        </section>
    );
}
