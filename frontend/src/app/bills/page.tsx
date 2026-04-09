"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

export default function BillsLegacyRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/user/bills");
    }, [router]);

    return null;
}
