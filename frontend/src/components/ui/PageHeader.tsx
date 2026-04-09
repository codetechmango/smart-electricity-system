import type { ReactNode } from "react";

type PageHeaderProps = {
    title: string;
    description: string;
    action?: ReactNode;
    badge?: ReactNode;
};

export default function PageHeader({ title, description, action, badge }: PageHeaderProps) {
    return (
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{title}</h1>
                    {badge ? <div>{badge}</div> : null}
                </div>
                <p className="mt-1 text-sm text-zinc-500">{description}</p>
            </div>
            {action ? <div>{action}</div> : null}
        </header>
    );
}