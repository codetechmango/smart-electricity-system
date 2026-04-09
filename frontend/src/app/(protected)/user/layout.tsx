import AppShell from "@/components/layout/AppShell";
import RouteGuard from "@/components/auth/RouteGuard";
import ChatWindow from "@/components/chatbot/ChatWindow";

export default function UserPanelLayout({ children }: { children: React.ReactNode }) {
    return (
        <RouteGuard allowRoles={["user"]}>
            <AppShell role="user" title="Customer Portal">
                {children}
                <ChatWindow />
            </AppShell>
        </RouteGuard>
    );
}
