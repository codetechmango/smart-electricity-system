"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { AppUser, LoginPayload, RegisterPayload } from "@/types";
import { authStorage, loginUser, registerUser } from "@/services/api";

type AuthContextValue = {
    user: AppUser | null;
    token: string;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (payload: LoginPayload) => Promise<AppUser>;
    register: (payload: RegisterPayload) => Promise<AppUser>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [authState, setAuthState] = useState<{
        user: AppUser | null;
        token: string;
        isLoading: boolean;
    }>({
        user: null,
        token: "",
        isLoading: true,
    });

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            const storedToken = window.localStorage.getItem(authStorage.tokenKey);
            const storedUser = window.localStorage.getItem(authStorage.userKey);

            if (storedToken && storedUser) {
                try {
                    setAuthState({
                        token: storedToken,
                        user: JSON.parse(storedUser) as AppUser,
                        isLoading: false,
                    });
                    return;
                } catch {
                    window.localStorage.removeItem(authStorage.tokenKey);
                    window.localStorage.removeItem(authStorage.userKey);
                }
            }

            setAuthState({
                user: null,
                token: "",
                isLoading: false,
            });
        }, 0);

        return () => {
            window.clearTimeout(timeout);
        };
    }, []);

    const login = useCallback(async (payload: LoginPayload) => {
        const response = await loginUser(payload);
        setAuthState({
            token: response.token,
            user: response.user,
            isLoading: false,
        });
        window.localStorage.setItem(authStorage.tokenKey, response.token);
        window.localStorage.setItem(authStorage.userKey, JSON.stringify(response.user));
        return response.user;
    }, []);

    const register = useCallback(async (payload: RegisterPayload) => {
        const response = await registerUser({
            ...payload,
            role: "user",
        });
        setAuthState({
            token: response.token,
            user: response.user,
            isLoading: false,
        });
        window.localStorage.setItem(authStorage.tokenKey, response.token);
        window.localStorage.setItem(authStorage.userKey, JSON.stringify(response.user));
        return response.user;
    }, []);

    const logout = useCallback(() => {
        setAuthState({
            token: "",
            user: null,
            isLoading: false,
        });
        window.localStorage.removeItem(authStorage.tokenKey);
        window.localStorage.removeItem(authStorage.userKey);
    }, []);

    const value = useMemo(
        () => ({
            user: authState.user,
            token: authState.token,
            isLoading: authState.isLoading,
            isAuthenticated: Boolean(authState.token && authState.user),
            login,
            register,
            logout,
        }),
        [authState, login, logout, register],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
