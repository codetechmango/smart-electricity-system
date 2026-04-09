"use client";

import { useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types";

export default function RouteGuard({
    children,
    allowRoles,
}: {
    children: React.ReactNode;
    allowRoles?: UserRole[];
}) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoading) {
            return;
        }

        if (!isAuthenticated) {
            router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
            return;
        }

        if (allowRoles?.length && user && !allowRoles.includes(user.role)) {
            router.replace(user.role === "admin" ? "/admin" : "/dashboard");
        }
    }, [allowRoles, isAuthenticated, isLoading, pathname, router, user]);

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <LoadingSpinner label="Validating your session..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (allowRoles?.length && user && !allowRoles.includes(user.role)) {
        return null;
    }

    return <>{children}</>;
}
