export type AssistantIntent =
    | "BILL_QUERY"
    | "HIGH_USAGE"
    | "SAVE_ENERGY"
    | "USAGE_TREND"
    | "PREDICTION"
    | "ALERTS"
    | "UNKNOWN";

const keywordMap: Record<Exclude<AssistantIntent, "UNKNOWN">, string[]> = {
    BILL_QUERY: ["bill", "amount", "cost", "charge", "payment"],
    HIGH_USAGE: ["high", "increase", "why", "spike", "more usage"],
    SAVE_ENERGY: ["save", "reduce", "tips", "lower", "cut down"],
    USAGE_TREND: ["trend", "usage", "history", "pattern", "compare"],
    PREDICTION: ["predict", "next bill", "estimate", "forecast"],
    ALERTS: ["alert", "anomaly", "warning", "issue"],
};

export function detectIntent(input: string): AssistantIntent {
    const normalized = input.toLowerCase();

    for (const [intent, keywords] of Object.entries(keywordMap) as Array<[
        Exclude<AssistantIntent, "UNKNOWN">,
        string[],
    ]>) {
        if (keywords.some((keyword) => normalized.includes(keyword))) {
            return intent;
        }
    }

    return "UNKNOWN";
}
