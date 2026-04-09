"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { generateBillForUser, getUserBills, toApiErrorMessage } from "@/services/api";
import type { Bill } from "@/types";

type BillRow = {
    id: string;
    month: string;
    units: string;
    amount: string;
    status: string;
    generatedDate: string;
};

export default function UserBillsPage() {
    const { user } = useAuth();
    const { pushToast } = useToast();

    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [downloadingBillId, setDownloadingBillId] = useState<string | null>(null);
    const [error, setError] = useState("");

    const loadBills = useCallback(async () => {
        if (!user) {
            return;
        }

        setLoading(true);
        setError("");
        try {
            setBills(await getUserBills(user.id));
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadBills();
    }, [loadBills]);

    const onGenerate = async () => {
        if (!user) {
            return;
        }

        setGenerating(true);
        setError("");
        try {
            const bill = await generateBillForUser(user.id);
            pushToast({
                variant: "success",
                title: "Bill generated",
                message: `${bill.month} bill was generated successfully.`,
            });
            await loadBills();
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setGenerating(false);
        }
    };

    const rows = useMemo<BillRow[]>(
        () =>
            bills.map((bill) => ({
                id: bill.id,
                month: bill.month,
                units: Number(bill.units).toFixed(2),
                amount: `Rs. ${Number(bill.bill_amount).toFixed(2)}`,
                status: bill.status,
                generatedDate: bill.generated_date,
            })),
        [bills],
    );

    const onDownloadPdf = async (row: BillRow) => {
        if (!user) {
            return;
        }

        setDownloadingBillId(row.id);

        try {
            const { jsPDF } = await import("jspdf");
            const doc = new jsPDF({ unit: "mm", format: "a4" });

            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 210, 30, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.text("Smart Electricity System", 14, 16);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Electricity Bill Invoice", 14, 23);

            doc.setTextColor(31, 41, 55);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.4);
            doc.roundedRect(14, 38, 182, 34, 2, 2);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("Invoice Details", 18, 45);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`Invoice ID: ${row.id}`, 18, 52);
            doc.text(`Month: ${row.month}`, 18, 58);
            doc.text(`Issued On: ${new Date(row.generatedDate).toLocaleDateString()}`, 18, 64);

            doc.setFont("helvetica", "bold");
            doc.text("Billed To", 112, 45);
            doc.setFont("helvetica", "normal");
            doc.text(`Name: ${user.name}`, 112, 52);
            doc.text(`Email: ${user.email}`, 112, 58);
            doc.text(`Area: ${user.area}`, 112, 64);

            doc.roundedRect(14, 82, 182, 60, 2, 2);
            doc.setFillColor(248, 250, 252);
            doc.rect(14.4, 82.4, 181.2, 12, "F");

            doc.setFont("helvetica", "bold");
            doc.text("Description", 18, 90);
            doc.text("Units", 118, 90);
            doc.text("Amount", 158, 90);

            doc.setFont("helvetica", "normal");
            doc.text(`Electricity Usage - ${row.month}`, 18, 104);
            doc.text(`${row.units} kWh`, 118, 104);
            doc.text(row.amount, 158, 104);

            doc.setDrawColor(226, 232, 240);
            doc.line(18, 112, 192, 112);

            doc.setFont("helvetica", "bold");
            doc.text("Total Amount", 118, 124);
            doc.text(row.amount, 158, 124);

            doc.setTextColor(100, 116, 139);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text("Thank you for using Smart Electricity System.", 14, 276);
            doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 281);

            const safeMonth = row.month.replace(/\s+/g, "-").toLowerCase();
            doc.save(`electricity-bill-${safeMonth}-${row.id}.pdf`);

            pushToast({
                variant: "success",
                title: "PDF downloaded",
                message: `Invoice for ${row.month} is ready.`,
            });
        } catch (err) {
            pushToast({
                variant: "error",
                title: "Failed to download PDF",
                message: toApiErrorMessage(err),
            });
        } finally {
            setDownloadingBillId(null);
        }
    };

    return (
        <section className="space-y-6">
            <PageHeader
                title="Bills"
                description="View generated bills and trigger billing for your account."
                action={
                    <button
                        type="button"
                        onClick={() => void onGenerate()}
                        disabled={generating}
                        className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {generating ? <LoadingSpinner inline label="Generating..." /> : "Generate Bill"}
                    </button>
                }
            />

            {error ? (
                <ErrorMessage
                    title="Unable to load bills"
                    message={error || "We could not fetch bill data. Please retry."}
                />
            ) : null}

            {!loading && rows.length === 0 ? (
                <EmptyState
                    title="No bills generated yet"
                    description="Generate your first bill to see monthly amount and consumption summary."
                    action={
                        <button
                            type="button"
                            onClick={() => void onGenerate()}
                            className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
                        >
                            Generate Bill
                        </button>
                    }
                />
            ) : (
                <DataTable
                    title="Billing History"
                    rows={rows}
                    loading={loading}
                    emptyMessage="No bills generated yet"
                    columns={[
                        { key: "month", header: "Month" },
                        { key: "units", header: "Units" },
                        { key: "amount", header: "Amount" },
                        {
                            key: "status",
                            header: "Status",
                            render: (row) => <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold uppercase">{row.status}</span>,
                        },
                        {
                            key: "action",
                            header: "Action",
                            render: (row) => (
                                <button
                                    type="button"
                                    onClick={() => void onDownloadPdf(row)}
                                    disabled={downloadingBillId === row.id}
                                    className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {downloadingBillId === row.id ? "Downloading..." : "Download PDF"}
                                </button>
                            ),
                        },
                    ]}
                />
            )}
        </section>
    );
}
