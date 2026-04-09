import type { ChangeEvent } from "react";

type FormInputProps = {
    id: string;
    name: string;
    label: string;
    type?: "text" | "number";
    value: string | number;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    min?: number;
    step?: number;
    required?: boolean;
};

export default function FormInput({
    id,
    name,
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    min,
    step,
    required = false,
}: FormInputProps) {
    return (
        <label htmlFor={id} className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">{label}</span>
            <input
                id={id}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                min={min}
                step={step}
                required={required}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
        </label>
    );
}