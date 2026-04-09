"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
    label: string;
    href: string;
    icon: React.ReactNode;
};

export default function Sidebar({
    items,
    collapsed,
    mobileOpen,
    onClose,
    onToggleCollapse,
}: {
    items: NavItem[];
    collapsed: boolean;
    mobileOpen: boolean;
    onClose: () => void;
    onToggleCollapse: () => void;
}) {
    const pathname = usePathname();

    return (
        <>
            {mobileOpen ? (
                <button
                    type="button"
                    aria-label="Close navigation"
                    className="fixed inset-0 z-40 bg-zinc-900/45 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            ) : null}

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex border-r border-zinc-200 bg-white/95 shadow-xl transition-all duration-300 lg:static lg:z-0 lg:shadow-none ${collapsed ? "w-[86px]" : "w-72"
                    } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
            >
                <div className="flex h-full w-full flex-col">
                    <div className="flex h-16 items-center justify-between border-b border-zinc-100 px-4">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600" />
                            {!collapsed ? <span className="text-sm font-semibold text-zinc-900">SE Monitoring</span> : null}
                        </div>
                        <button
                            type="button"
                            onClick={onToggleCollapse}
                            className="hidden rounded-lg border border-zinc-200 p-1.5 text-zinc-600 transition hover:bg-zinc-100 lg:inline-flex"
                        >
                            <svg
                                className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                        </button>
                    </div>

                    <nav className="flex-1 space-y-1 px-3 py-4">
                        {items.map((item) => {
                            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                        }`}
                                >
                                    <span className="inline-flex h-5 w-5 items-center justify-center">{item.icon}</span>
                                    {!collapsed ? <span>{item.label}</span> : null}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="border-t border-zinc-100 p-3 text-xs text-zinc-500">
                        {!collapsed ? "Realtime analytics and smart anomaly tracking" : "SE"}
                    </div>
                </div>
            </aside>
        </>
    );
}
