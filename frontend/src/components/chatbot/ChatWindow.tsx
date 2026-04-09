"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ChatInput from "@/components/chatbot/ChatInput";
import ChatMessage from "@/components/chatbot/ChatMessage";
import { useAuth } from "@/context/AuthContext";
import { detectIntent } from "@/logic/intentDetector";
import { buildAssistantData, generateResponse } from "@/logic/responseGenerator";
import { getUserDashboard } from "@/services/api";

type Message = {
    id: number;
    role: "user" | "bot" | "system";
    text: string;
    timestamp: string;
};

const quickSuggestions = [
    "Why is my bill high?",
    "How can I save electricity?",
    "Show my usage trend",
    "Predict my next bill",
];

const timeLabel = () =>
    new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

export default function ChatWindow() {
    const { user } = useAuth();

    const [open, setOpen] = useState(false);
    const [typing, setTyping] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [assistantData, setAssistantData] = useState<ReturnType<typeof buildAssistantData> | null>(null);
    const [loadingData, setLoadingData] = useState(false);

    const scrollRef = useRef<HTMLDivElement | null>(null);

    const addMessage = useCallback((role: Message["role"], text: string) => {
        setMessages((prev) => [
            ...prev,
            {
                id: Date.now() + Math.floor(Math.random() * 1000),
                role,
                text,
                timestamp: timeLabel(),
            },
        ]);
    }, []);

    useEffect(() => {
        const loadAssistantData = async () => {
            if (!user) {
                return;
            }

            setLoadingData(true);
            try {
                const payload = await getUserDashboard(user.id);
                setAssistantData(buildAssistantData(payload.readings, payload.bills, payload.alerts));
            } catch {
                setAssistantData(null);
            } finally {
                setLoadingData(false);
            }
        };

        void loadAssistantData();
    }, [user]);

    useEffect(() => {
        if (!scrollRef.current) {
            return;
        }
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, typing, open]);

    const handleUserMessage = (text: string) => {
        addMessage("user", text);
        setTyping(true);

        window.setTimeout(() => {
            const intent = detectIntent(text);

            if (!assistantData) {
                addMessage(
                    "bot",
                    "I am syncing your latest usage data. Please try again in a moment for personalized insights.",
                );
                setTyping(false);
                return;
            }

            const response = generateResponse(intent, text, assistantData);
            addMessage("bot", response.text);

            if (response.suggestions?.length) {
                addMessage("system", `Suggestions: ${response.suggestions.join(" | ")}`);
            }

            setTyping(false);
        }, 700);
    };

    const statusText = useMemo(() => {
        if (loadingData) {
            return "Syncing usage data...";
        }
        if (!assistantData) {
            return "Data unavailable";
        }
        return "Connected to your live usage profile";
    }, [assistantData, loadingData]);

    return (
        <div className="fixed bottom-5 right-5 z-[90]">
            {open ? (
                <div className="mb-3 w-[92vw] max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl transition-all duration-300">
                    <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-900 px-4 py-3 text-white">
                        <div>
                            <h3 className="text-sm font-semibold">Smart Energy Assistant</h3>
                            <p className="text-[11px] text-zinc-300">{statusText}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-lg border border-zinc-600 px-2 py-1 text-xs"
                        >
                            Close
                        </button>
                    </div>

                    <div ref={scrollRef} className="h-96 space-y-3 overflow-y-auto bg-zinc-50 p-3">
                        {messages.length === 0 ? (
                            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                                <p>Hi 👋 I&apos;m your Energy Assistant. Ask me anything about your electricity usage.</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {quickSuggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => handleUserMessage(suggestion)}
                                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800 transition hover:bg-sky-100"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {messages.map((message) => (
                            <ChatMessage key={message.id} role={message.role} text={message.text} timestamp={message.timestamp} />
                        ))}

                        {typing ? (
                            <div className="mr-auto w-fit rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
                                Assistant is typing...
                            </div>
                        ) : null}
                    </div>

                    <div className="border-t border-zinc-100 bg-white px-3 py-2">
                        <div className="mb-2 flex flex-wrap gap-2">
                            {quickSuggestions.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => handleUserMessage(suggestion)}
                                    className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-200"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>

                    <ChatInput onSend={handleUserMessage} disabled={typing} />
                </div>
            ) : null}

            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="ml-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-xl transition hover:scale-105 hover:bg-zinc-700"
                aria-label="Open Smart Energy Assistant"
            >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8 10h8M8 14h5" />
                    <path d="M21 12a9 9 0 1 1-3.7-7.28L21 3v9Z" />
                </svg>
            </button>
        </div>
    );
}
