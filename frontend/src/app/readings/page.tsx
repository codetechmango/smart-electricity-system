"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

export default function ReadingsLegacyRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/user/usage");
    }, [router]);

    return null;
}
