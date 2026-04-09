"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

export default function AlertsLegacyRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/user/alerts");
    }, [router]);

    return null;
}
