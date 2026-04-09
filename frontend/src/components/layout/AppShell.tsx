"use client";

import { useMemo, useState } from "react";

import Sidebar, { NavItem } from "@/components/layout/sidebar";
import Topbar from "@/components/layout/Topbar";
import type { UserRole } from "@/types";

const icons = {
    dashboard: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 13h8V3H3v10Zm10 8h8V11h-8v10Zm0-18v4h8V3h-8ZM3 21h8v-4H3v4Z" />
        </svg>
    ),
    usage: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3v18M5 15l7 6 7-6M5 9l7-6 7 6" />
        </svg>
    ),
    bills: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M7 8h10M7 12h5" />
        </svg>
    ),
    alerts: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0Z" />
        </svg>
    ),
    profile: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c2-4 5-6 8-6s6 2 8 6" />
        </svg>
    ),
    users: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6M23 11h-6" />
        </svg>
    ),
    readings: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2v20M2 12h20" />
        </svg>
    ),
};

const userNav: NavItem[] = [
    { label: "Dashboard", href: "/user/dashboard", icon: icons.dashboard },
    { label: "Usage", href: "/user/usage", icon: icons.usage },
    { label: "Bills", href: "/user/bills", icon: icons.bills },
    { label: "Alerts", href: "/user/alerts", icon: icons.alerts },
    { label: "Profile", href: "/user/profile", icon: icons.profile },
];

const adminNav: NavItem[] = [
    { label: "Dashboard", href: "/admin/dashboard", icon: icons.dashboard },
    { label: "Manage Users", href: "/admin/users", icon: icons.users },
    { label: "Meter Readings", href: "/admin/readings", icon: icons.readings },
    { label: "Alerts", href: "/admin/alerts", icon: icons.alerts },
];

export default function AppShell({
    role,
    title,
    children,
}: {
    role: UserRole;
    title: string;
    children: React.ReactNode;
}) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = useMemo(() => (role === "admin" ? adminNav : userNav), [role]);

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0f2fe,_#f8fafc_40%,_#eef2ff_100%)]">
            <div className="flex min-h-screen">
                <Sidebar
                    items={navItems}
                    collapsed={collapsed}
                    mobileOpen={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    onToggleCollapse={() => setCollapsed((prev) => !prev)}
                />

                <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                    <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
                    <main className="p-4 md:p-6">{children}</main>
                </div>
            </div>
        </div>
    );
}
