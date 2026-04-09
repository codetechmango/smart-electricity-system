"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    router.replace(user?.role === "admin" ? "/admin" : "/dashboard");
  }, [isAuthenticated, isLoading, router, user?.role]);

  return null;
}