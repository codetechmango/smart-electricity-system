"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import DataTable from "@/components/ui/DataTable";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/context/ToastContext";
import { createUser, deleteUser, getUsers, toApiErrorMessage } from "@/services/api";
import type { AppUser } from "@/types";

type UserRow = {
    id: number;
    name: string;
    email: string;
    area: string;
    role: string;
    roleRaw: AppUser["role"];
};

export default function AdminUsersPage() {
    const { pushToast } = useToast();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [area, setArea] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            setUsers(await getUsers());
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const onAddUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!name || !email || !area || password.length < 6) {
            setError("All fields are required and password must be at least 6 characters.");
            return;
        }

        setSubmitting(true);
        setError("");
        try {
            await createUser({ name, email, password, area, role: "user" });
            pushToast({
                variant: "success",
                title: "User added",
                message: `${name} has been created.`,
            });
            setOpen(false);
            setName("");
            setEmail("");
            setPassword("");
            setArea("");
            await load();
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    const rows = useMemo<UserRow[]>(
        () =>
            users.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                area: user.area,
                role: user.role.toUpperCase(),
                roleRaw: user.role,
            })),
        [users],
    );

    const onRequestDelete = (row: UserRow) => {
        setSelectedUser(row);
        setDeleteOpen(true);
    };

    const onConfirmDelete = async () => {
        if (!selectedUser || selectedUser.roleRaw === "admin") {
            return;
        }

        setDeletingUserId(selectedUser.id);
        setError("");
        try {
            const result = await deleteUser(selectedUser.id);
            setUsers((prev) => prev.filter((user) => user.id !== selectedUser.id));
            pushToast({
                variant: "success",
                title: "User deleted",
                message: result.message,
            });
            setDeleteOpen(false);
            setSelectedUser(null);
        } catch (err) {
            setError(toApiErrorMessage(err));
        } finally {
            setDeletingUserId(null);
        }
    };

    return (
        <section className="space-y-6">
            <PageHeader
                title="Manage Users"
                description="Create and monitor customer/admin accounts."
                action={
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
                    >
                        Add User
                    </button>
                }
            />

            {error ? (
                <ErrorMessage
                    title="Unable to load users"
                    message={error || "We could not fetch user data right now. Please retry."}
                />
            ) : null}

            <DataTable
                title="Registered Users"
                rows={rows}
                loading={loading}
                emptyMessage="No users found"
                columns={[
                    { key: "name", header: "Name" },
                    { key: "email", header: "Email" },
                    { key: "area", header: "Area" },
                    {
                        key: "role",
                        header: "Role",
                        render: (row) => <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold">{row.role}</span>,
                    },
                    {
                        key: "action",
                        header: "Action",
                        render: (row) => (
                            <button
                                type="button"
                                onClick={() => onRequestDelete(row)}
                                disabled={row.roleRaw === "admin" || deletingUserId === row.id}
                                className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {deletingUserId === row.id ? "Deleting..." : row.roleRaw === "admin" ? "Protected" : "Delete"}
                            </button>
                        ),
                    },
                ]}
            />

            <Modal open={open} title="Add New User" onClose={() => setOpen(false)}>
                <form onSubmit={onAddUser} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="text-sm font-medium text-zinc-700 md:col-span-2">
                        Full Name
                        <input
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                            required
                        />
                    </label>
                    <label className="text-sm font-medium text-zinc-700">
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                            required
                        />
                    </label>
                    <label className="text-sm font-medium text-zinc-700">
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                            required
                        />
                    </label>
                    <label className="text-sm font-medium text-zinc-700">
                        Area
                        <input
                            type="text"
                            value={area}
                            onChange={(event) => setArea(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                            required
                        />
                    </label>
                    <label className="text-sm font-medium text-zinc-700">
                        Role
                        <input
                            type="text"
                            value="User"
                            readOnly
                            className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-100 px-3 py-2.5 text-sm text-zinc-600 outline-none"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-70 md:col-span-2"
                    >
                        {submitting ? <LoadingSpinner inline label="Adding..." /> : "Create User"}
                    </button>
                </form>
            </Modal>

            <Modal open={deleteOpen} title="Delete User" onClose={() => (deletingUserId ? undefined : setDeleteOpen(false))}>
                <div className="space-y-4">
                    <p className="text-sm text-zinc-700">
                        Are you sure you want to delete this user?
                    </p>
                    {selectedUser ? (
                        <p className="text-xs text-zinc-500">
                            {selectedUser.name} ({selectedUser.email})
                        </p>
                    ) : null}
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setDeleteOpen(false)}
                            disabled={Boolean(deletingUserId)}
                            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void onConfirmDelete()}
                            disabled={Boolean(deletingUserId)}
                            className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {deletingUserId ? <LoadingSpinner inline label="Deleting..." /> : "Confirm Delete"}
                        </button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
