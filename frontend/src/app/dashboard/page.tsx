"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export default function DashboardRedirectPage() {
    const router = useRouter();
    const { user, isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isLoading) {
            return;
        }

        if (!isAuthenticated) {
            router.replace("/login");
            return;
        }

        router.replace(user?.role === "admin" ? "/admin" : "/user/dashboard");
    }, [isAuthenticated, isLoading, router, user?.role]);

    return null;
}
