"use client";

import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";

export default function UserProfilePage() {
    const { user } = useAuth();

    const rows = [
        { label: "Full Name", value: user?.name || "-" },
        { label: "Email", value: user?.email || "-" },
        { label: "Area", value: user?.area || "-" },
        { label: "Role", value: user?.role?.toUpperCase() || "-" },
        { label: "Account Status", value: "Active" },
    ];

    return (
        <section className="space-y-6">
            <PageHeader title="Profile" description="Account details and registered service area information." />

            <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900">User Details</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {rows.map((row) => (
                        <div key={row.label} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{row.label}</p>
                            <p className="mt-2 text-base font-semibold text-zinc-900">{row.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
