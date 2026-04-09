import { useCallback, useEffect, useRef, useState } from "react";

import { toApiErrorMessage } from "@/services/api";

type UseFetchOptions = {
    immediate?: boolean;
};

export default function useFetch<T>(fetcher: () => Promise<T>, options?: UseFetchOptions) {
    const { immediate = true } = options ?? {};
    const isMountedRef = useRef<boolean>(true);
    const fetcherRef = useRef(fetcher);

    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(immediate);

    useEffect(() => {
        fetcherRef.current = fetcher;
    }, [fetcher]);

    const execute = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetcherRef.current();
            if (isMountedRef.current) {
                setData(response);
            }
            return response;
        } catch (err) {
            if (isMountedRef.current) {
                setError(toApiErrorMessage(err));
            }
            return null;
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        if (immediate) {
            void execute();
        }

        return () => {
            isMountedRef.current = false;
        };
    }, [execute, immediate]);

    return {
        data,
        error,
        loading,
        setData,
        refetch: execute,
    };
}