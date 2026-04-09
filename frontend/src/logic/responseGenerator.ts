import type { Alert, Bill, Reading } from "@/types";

import type { AssistantIntent } from "@/logic/intentDetector";

const ENERGY_RATE = 6.8;

type AssistantData = {
    currentMonthUsage: number;
    lastMonthUsage: number;
    usageChangePercent: number;
    predictedUnits: number;
    predictedCost: number;
    latestBillAmount: number;
    latestBillMonth: string;
    alertsCount: number;
    latestAlertExplanation: string;
    smartTips: string[];
};

export type AssistantResponse = {
    text: string;
    suggestions?: string[];
};

const monthKey = (date: string) => {
    const parsed = new Date(date);
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
};

export function buildAssistantData(readings: Reading[], bills: Bill[], alerts: Alert[]): AssistantData {
    const grouped = readings.reduce<Record<string, number>>((acc, reading) => {
        const key = monthKey(reading.timestamp);
        acc[key] = (acc[key] ?? 0) + Number(reading.units || 0);
        return acc;
    }, {});

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousKey = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;

    const currentMonthUsage = Number(grouped[currentKey] ?? 0);
    const lastMonthUsage = Number(grouped[previousKey] ?? 0);
    const usageChangePercent =
        lastMonthUsage > 0 ? ((currentMonthUsage - lastMonthUsage) / lastMonthUsage) * 100 : 0;

    const monthSeries = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, units]) => Number(units));
    const sampleSize = Math.min(3, monthSeries.length);
    const predictedUnits =
        sampleSize > 0
            ? monthSeries.slice(-sampleSize).reduce((sum, value) => sum + value, 0) / sampleSize
            : currentMonthUsage;
    const predictedCost = predictedUnits * ENERGY_RATE;

    const sortedBills = [...bills].sort(
        (a, b) => new Date(b.generated_date).getTime() - new Date(a.generated_date).getTime(),
    );

    const latestOpenAlert = alerts.find((alert) => !alert.resolved);

    const smartTips: string[] = [];
    if (usageChangePercent > 20) {
        smartTips.push("Try reducing AC usage by 1 hour daily to lower monthly cost.");
    }
    if (currentMonthUsage > 300) {
        smartTips.push("Use eco mode for heavy appliances during peak periods.");
    }
    if (smartTips.length === 0) {
        smartTips.push("Your usage trend looks stable. Maintain current usage habits.");
    }

    return {
        currentMonthUsage,
        lastMonthUsage,
        usageChangePercent,
        predictedUnits: Number(predictedUnits.toFixed(2)),
        predictedCost: Number(predictedCost.toFixed(2)),
        latestBillAmount: Number(sortedBills[0]?.bill_amount ?? 0),
        latestBillMonth: sortedBills[0]?.month ?? "latest cycle",
        alertsCount: alerts.filter((alert) => !alert.resolved).length,
        latestAlertExplanation:
            latestOpenAlert?.explanation || "No major anomaly detected in your current usage profile.",
        smartTips,
    };
}

export function generateResponse(
    intent: AssistantIntent,
    userInput: string,
    data: AssistantData,
): AssistantResponse {
    switch (intent) {
        case "BILL_QUERY": {
            const diffCost = (data.currentMonthUsage - data.lastMonthUsage) * ENERGY_RATE;
            const changeText =
                data.usageChangePercent > 0
                    ? `This month usage is up by ${data.usageChangePercent.toFixed(1)}%, about Rs. ${Math.abs(diffCost).toFixed(2)} more.`
                    : `This month usage is down by ${Math.abs(data.usageChangePercent).toFixed(1)}%, about Rs. ${Math.abs(diffCost).toFixed(2)} saved.`;

            return {
                text: `Your latest bill for ${data.latestBillMonth} is Rs. ${data.latestBillAmount.toFixed(2)}. ${changeText}`,
                suggestions: ["Why is my bill high?", "Predict my next bill"],
            };
        }

        case "HIGH_USAGE":
            return {
                text: `Your current month usage is ${data.currentMonthUsage.toFixed(2)} units, ${Math.abs(data.usageChangePercent).toFixed(1)}% ${data.usageChangePercent >= 0 ? "higher" : "lower"
                    } than last month. Possible reason: ${data.latestAlertExplanation}`,
                suggestions: ["How can I save electricity?", "Show my usage trend"],
            };

        case "SAVE_ENERGY":
            return {
                text: `${data.smartTips[0]} Following this can reduce your monthly bill by roughly Rs. ${(data.predictedCost * 0.08).toFixed(0)} based on your current pattern.`,
                suggestions: ["Show my usage trend", "Predict my next bill"],
            };

        case "USAGE_TREND":
            return {
                text: `Current month: ${data.currentMonthUsage.toFixed(2)} units. Last month: ${data.lastMonthUsage.toFixed(2)} units. Net change: ${data.usageChangePercent.toFixed(1)}%. Check the dashboard trend charts for detailed month-wise breakdown.`,
                suggestions: ["Why is my bill high?", "How can I save electricity?"],
            };

        case "PREDICTION":
            return {
                text: `Based on a moving average of recent usage, your next bill is estimated at Rs. ${data.predictedCost.toFixed(2)} for around ${data.predictedUnits.toFixed(2)} units.`,
                suggestions: ["How can I save electricity?", "Show my usage trend"],
            };

        case "ALERTS":
            return {
                text: data.alertsCount > 0
                    ? `You currently have ${data.alertsCount} active alert(s). Latest insight: ${data.latestAlertExplanation}`
                    : "You currently have no active anomaly alerts. Your profile looks stable.",
                suggestions: ["Why is my bill high?", "How can I save electricity?"],
            };

        default:
            return {
                text: `I can help with billing, usage trends, anomaly alerts, savings tips, and next bill prediction. You asked: "${userInput}". Try one of the quick options below.`,
                suggestions: [
                    "Why is my bill high?",
                    "How can I save electricity?",
                    "Show my usage trend",
                    "Predict my next bill",
                ],
            };
    }
}
