import AppShell from "@/components/layout/AppShell";
import RouteGuard from "@/components/auth/RouteGuard";

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
    return (
        <RouteGuard allowRoles={["admin"]}>
            <AppShell role="admin" title="Operations Console">
                {children}
            </AppShell>
        </RouteGuard>
    );
}
