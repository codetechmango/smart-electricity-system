import type { ReactNode } from "react";

type ErrorMessageProps = {
    message: string;
    title?: string;
    action?: ReactNode;
};

export default function ErrorMessage({ message, title = "Something went wrong", action }: ErrorMessageProps) {
    return (
        <div className="ui-fade-in rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 shadow-sm">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                    !
                </span>
                <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1">{message || "We hit a temporary issue. Please try again."}</p>
                </div>
            </div>
            {action ? <div className="mt-3">{action}</div> : null}
        </div>
    );
}