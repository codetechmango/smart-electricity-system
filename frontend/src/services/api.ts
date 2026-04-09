import axios, { AxiosError } from "axios";

import type { Alert, AppUser, Bill, LoginPayload, Reading, RegisterPayload, UserRole } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8000";

const AUTH_TOKEN_KEY = "sems.auth.token";
const AUTH_USER_KEY = "sems.auth.user";
const MOCK_USERS_KEY = "sems.mock.users";
const MOCK_READINGS_KEY = "sems.mock.readings";
const MOCK_BILLS_KEY = "sems.mock.bills";
const MOCK_ALERTS_KEY = "sems.mock.alerts";

type ApiErrorPayload = {
    detail?: unknown;
    message?: string;
};

type MockUser = AppUser & {
    password: string;
};

export type DashboardData = {
    total_users: number;
    total_units: number;
    total_readings: number;
    active_alerts: number;
};

export type ReadingPayload = {
    user_id: number;
    previous_reading: number;
    current_reading: number;
    reading_date?: string;
};

export type AuthResponse = {
    token: string;
    user: AppUser;
};

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

const canUseStorage = () => typeof window !== "undefined";

api.interceptors.request.use((config) => {
    if (canUseStorage()) {
        const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error),
);

export const toApiErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiErrorPayload>;
        const status = axiosError.response?.status;
        const payload = axiosError.response?.data;

        if (Array.isArray(payload?.detail)) {
            const details = payload.detail
                .map((item) => {
                    if (typeof item === "object" && item !== null) {
                        const record = item as { msg?: string; loc?: Array<string | number> };
                        const fieldPath = Array.isArray(record.loc) ? record.loc.join(".") : "field";
                        return record.msg ? `${fieldPath}: ${record.msg}` : JSON.stringify(item);
                    }
                    return String(item);
                })
                .join("; ");
            return `${status ?? "HTTP"} ${details}`;
        }

        if (typeof payload?.detail === "string") {
            return `${status ?? "HTTP"} ${payload.detail}`;
        }

        if (typeof payload?.message === "string") {
            return `${status ?? "HTTP"} ${payload.message}`;
        }

        return axiosError.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Unexpected API error";
};

const getStore = <T>(key: string, fallback: T): T => {
    if (!canUseStorage()) {
        return fallback;
    }

    const raw = window.localStorage.getItem(key);
    if (!raw) {
        return fallback;
    }

    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
};

const setStore = <T>(key: string, value: T) => {
    if (!canUseStorage()) {
        return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
};

const monthName = (date: Date) =>
    date.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
    });

const createSeedData = () => {
    const now = new Date();
    const seededUsers: MockUser[] = [
        {
            id: 1,
            name: "System Admin",
            email: "admin@smartgrid.com",
            password: "Admin@123",
            area: "HQ",
            role: "admin",
        },
        {
            id: 2,
            name: "Priya Kumar",
            email: "priya@consumer.com",
            password: "User@123",
            area: "Chennai North",
            role: "user",
        },
    ];

    const seededReadings: Reading[] = Array.from({ length: 10 }).map((_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (9 - index), 10);
        const units = 220 + index * 17;
        return {
            id: index + 1,
            user_id: 2,
            units,
            load_value: 3000 + index * 120,
            timestamp: date.toISOString(),
            is_anomaly: units > 350,
        };
    });

    const seededBills: Bill[] = seededReadings.slice(-6).map((reading) => ({
        id: `B-${reading.id}`,
        user_id: reading.user_id,
        units: reading.units,
        bill_amount: Number((reading.units * 6.8).toFixed(2)),
        status: "generated",
        generated_date: reading.timestamp,
        month: monthName(new Date(reading.timestamp)),
    }));

    const seededAlerts: Alert[] = seededReadings
        .filter((reading) => reading.is_anomaly)
        .map((reading, idx) => ({
            id: idx + 1,
            user_id: reading.user_id,
            message: "Unusual high consumption detected",
            explanation: "30.0% increase detected. High appliance usage.",
            percentage_increase: 30,
            type: "high-usage",
            timestamp: reading.timestamp,
            resolved: false,
        }));

    setStore(MOCK_USERS_KEY, seededUsers);
    setStore(MOCK_READINGS_KEY, seededReadings);
    setStore(MOCK_BILLS_KEY, seededBills);
    setStore(MOCK_ALERTS_KEY, seededAlerts);
};

const ensureSeedData = () => {
    const users = getStore<MockUser[]>(MOCK_USERS_KEY, []);
    if (users.length === 0) {
        createSeedData();
    }
};

const mapMockUser = (user: MockUser): AppUser => ({
    id: user.id,
    name: user.name,
    email: user.email,
    area: user.area,
    role: user.role,
});

const buildAnomalyReason = (percentageIncrease: number): string => {
    if (percentageIncrease > 0) {
        return `Your usage increased by ${percentageIncrease.toFixed(2)}% compared to your average.`;
    }
    if (percentageIncrease < 0) {
        return `Your usage decreased by ${Math.abs(percentageIncrease).toFixed(2)}% compared to your average.`;
    }
    return "Your usage is unchanged compared to your average.";
};

const normalizeAlert = (alert: Partial<Alert> & { id: number; user_id: number; timestamp: string }): Alert => {
    const rawPercentage = alert.percentage_increase;
    const percentageIncrease =
        typeof rawPercentage === "number" && Number.isFinite(rawPercentage)
            ? Number(rawPercentage.toFixed(2))
            : null;
    const explanation =
        alert.explanation ||
        (percentageIncrease === null ? "Insufficient data" : buildAnomalyReason(percentageIncrease));

    const resolvedFromStatus = alert.status === "resolved";

    return {
        id: alert.id,
        user_id: alert.user_id,
        message: alert.message || "Unusual high consumption detected",
        explanation,
        percentage_increase: percentageIncrease,
        status: alert.status === "resolved" ? "resolved" : "open",
        resolved_at: alert.resolved_at ?? null,
        type: alert.type || "high-usage",
        timestamp: alert.timestamp,
        resolved: resolvedFromStatus || Boolean(alert.resolved),
    };
};

export const authStorage = {
    tokenKey: AUTH_TOKEN_KEY,
    userKey: AUTH_USER_KEY,
};

export const loginUser = async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await api.post<{ access_token?: string; token?: string; user?: AppUser }>("/auth/login", payload);
    const token = response.data.access_token || response.data.token;
    if (!token || !response.data.user) {
        throw new Error("Authentication response is invalid");
    }

    return {
        token,
        user: response.data.user,
    };
};

export const registerUser = async (payload: RegisterPayload): Promise<AuthResponse> => {
    const nextRole: UserRole = "user";

    if (payload.role && payload.role !== "user") {
        throw new Error("New admin accounts cannot be created from the frontend.");
    }

    const normalizedPayload = {
        ...payload,
        role: "user" as const,
    };

    const response = await api.post<{ access_token?: string; token?: string; user?: AppUser }>("/auth/register", normalizedPayload);
    const token = response.data.access_token || response.data.token;
    if (!token || !response.data.user) {
        throw new Error("Authentication response is invalid");
    }

    return {
        token,
        user: {
            ...response.data.user,
            role: response.data.user.role || nextRole,
        },
    };
};

export const getUsers = async (): Promise<AppUser[]> => {
    try {
        const response = await api.get<AppUser[]>("/users");
        return response.data;
    } catch {
        ensureSeedData();
        return getStore<MockUser[]>(MOCK_USERS_KEY, []).map(mapMockUser);
    }
};

export const createUser = async (payload: RegisterPayload): Promise<AppUser> => {
    if (payload.role && payload.role !== "user") {
        throw new Error("New admin accounts cannot be created from the frontend.");
    }

    const normalizedPayload = {
        ...payload,
        role: "user" as const,
    };

    try {
        const response = await api.post<AppUser>("/users", normalizedPayload);
        return response.data;
    } catch {
        ensureSeedData();
        const users = getStore<MockUser[]>(MOCK_USERS_KEY, []);
        const created: MockUser = {
            id: Date.now(),
            name: normalizedPayload.name,
            email: normalizedPayload.email,
            password: normalizedPayload.password,
            area: normalizedPayload.area,
            role: "user",
        };
        setStore(MOCK_USERS_KEY, [...users, created]);
        return mapMockUser(created);
    }
};

export const deleteUser = async (userId: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/admin/users/${userId}`);
    return response.data;
};

export const getAllReadings = async (): Promise<Reading[]> => {
    try {
        const response = await api.get<Reading[]>("/readings");
        return response.data;
    } catch {
        ensureSeedData();
        return getStore<Reading[]>(MOCK_READINGS_KEY, []);
    }
};

export const getUserReadings = async (userId: number): Promise<Reading[]> => {
    const readings = await getAllReadings();
    return readings.filter((item) => Number(item.user_id) === Number(userId));
};

export const addMeterReading = async (payload: ReadingPayload): Promise<Reading> => {
    try {
        await api.post("/meter/add-reading", {
            user_id: payload.user_id,
            previous_reading: payload.previous_reading,
            current_reading: payload.current_reading,
            reading_date: payload.reading_date,
        });
    } catch {
        // Continue with local mock update.
    }

    ensureSeedData();
    const readings = getStore<Reading[]>(MOCK_READINGS_KEY, []);
    const units = Math.max(0, payload.current_reading - payload.previous_reading);
    const userHistory = readings.filter((item) => Number(item.user_id) === Number(payload.user_id));
    const averageUnits =
        userHistory.length > 0
            ? userHistory.reduce((sum, item) => sum + Number(item.units || 0), 0) / userHistory.length
            : 0;

    let percentageIncrease: number | null = null;
    if (userHistory.length > 0) {
        if (averageUnits === 0) {
            percentageIncrease = units > 0 ? 100 : 0;
        } else {
            percentageIncrease = ((units - averageUnits) / averageUnits) * 100;
        }
        percentageIncrease = Number(percentageIncrease.toFixed(2));
    }

    const isAnomaly = percentageIncrease !== null && percentageIncrease > 30;

    const reading: Reading = {
        id: Date.now(),
        user_id: payload.user_id,
        units,
        load_value: payload.current_reading,
        timestamp: payload.reading_date ? new Date(payload.reading_date).toISOString() : new Date().toISOString(),
        is_anomaly: isAnomaly,
    };

    setStore(MOCK_READINGS_KEY, [reading, ...readings]);

    if (reading.is_anomaly) {
        const alerts = getStore<Alert[]>(MOCK_ALERTS_KEY, []);
        const reason = percentageIncrease === null ? "Insufficient data" : buildAnomalyReason(percentageIncrease);

        setStore(MOCK_ALERTS_KEY, [
            {
                id: Date.now() + 1,
                user_id: payload.user_id,
                message: "Unusual high consumption detected",
                explanation: reason,
                percentage_increase: percentageIncrease,
                type: "high-usage",
                timestamp: reading.timestamp,
                resolved: false,
            },
            ...alerts,
        ]);
    }

    return reading;
};

export const getAllBills = async (): Promise<Bill[]> => {
    try {
        const response = await api.get<Bill[]>("/bills");
        return response.data;
    } catch {
        ensureSeedData();
        return getStore<Bill[]>(MOCK_BILLS_KEY, []);
    }
};

export const getUserBills = async (userId: number): Promise<Bill[]> => {
    const bills = await getAllBills();
    return bills.filter((bill) => Number(bill.user_id) === Number(userId));
};

export const clearAllBillsData = async (): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>("/admin/clear-bills");
    return response.data;
};

export const resetDemoSystem = async (): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>("/admin/reset-system");
    return response.data;
};

export const generateDemoData = async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>("/admin/generate-demo-data", {});
    return response.data;
};

export const generateBillForUser = async (userId: number): Promise<Bill> => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const targetMonth = now.getMonth() + 1;

        const response = await api.post<{
            month?: string;
            total_units?: number;
            predicted_amount?: number;
            amount?: number;
        }>(`/meter/generate-bill/${userId}?year=${year}&month=${targetMonth}`);

        const month = response.data.month || monthName(new Date());
        const units = Number(response.data.total_units ?? 0);
        const amount = Number(response.data.predicted_amount ?? response.data.amount ?? 0);

        const created: Bill = {
            id: `B-${Date.now()}`,
            user_id: userId,
            units,
            bill_amount: Number(amount.toFixed(2)),
            status: "generated",
            generated_date: new Date().toISOString(),
            month,
        };

        const existing = getStore<Bill[]>(MOCK_BILLS_KEY, []);
        setStore(MOCK_BILLS_KEY, [created, ...existing]);
        return created;
    } catch {
        ensureSeedData();
        const readings = await getUserReadings(userId);
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
        const units = readings
            .filter((reading) => {
                const date = new Date(reading.timestamp);
                return `${date.getFullYear()}-${date.getMonth() + 1}` === monthKey;
            })
            .reduce((sum, reading) => sum + Number(reading.units || 0), 0);

        const created: Bill = {
            id: `B-${Date.now()}`,
            user_id: userId,
            units,
            bill_amount: Number((units * 6.8).toFixed(2)),
            status: "generated",
            generated_date: now.toISOString(),
            month: monthName(now),
        };

        const bills = getStore<Bill[]>(MOCK_BILLS_KEY, []);
        setStore(MOCK_BILLS_KEY, [created, ...bills]);
        return created;
    }
};

export const getAllAlerts = async (): Promise<Alert[]> => {
    try {
        const response = await api.get<Alert[]>("/alerts");
        return response.data.map((alert) => normalizeAlert(alert));
    } catch {
        ensureSeedData();
        return getStore<Alert[]>(MOCK_ALERTS_KEY, []).map((alert) => normalizeAlert(alert));
    }
};

export const getUserAlerts = async (userId: number): Promise<Alert[]> => {
    const alerts = await getAllAlerts();
    return alerts.filter((item) => Number(item.user_id) === Number(userId));
};

export const resolveAlert = async (alertId: number): Promise<void> => {
    await api.put(`/admin/alerts/${alertId}/resolve`);
};

export const getDashboardData = async (): Promise<DashboardData> => {
    try {
        const response = await api.get<DashboardData>("/dashboard");
        return response.data;
    } catch {
        ensureSeedData();
        const [users, readings, alerts] = await Promise.all([getUsers(), getAllReadings(), getAllAlerts()]);

        return {
            total_users: users.length,
            total_units: readings.reduce((sum, item) => sum + Number(item.units), 0),
            total_readings: readings.length,
            active_alerts: alerts.filter((item) => !item.resolved).length,
        };
    }
};

export const getUserDashboard = async (userId: number) => {
    const [readings, bills, alerts] = await Promise.all([
        getUserReadings(userId),
        getUserBills(userId),
        getUserAlerts(userId),
    ]);

    const totalUnits = readings.reduce((sum, item) => sum + Number(item.units), 0);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const currentMonthUsage = readings
        .filter((reading) => {
            const date = new Date(reading.timestamp);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, item) => sum + Number(item.units), 0);

    const sortedBills = [...bills].sort(
        (a, b) => new Date(b.generated_date).getTime() - new Date(a.generated_date).getTime(),
    );

    return {
        totalUnits,
        currentMonthUsage,
        lastBillAmount: sortedBills[0]?.bill_amount ?? 0,
        readings,
        bills,
        alerts,
    };
};
