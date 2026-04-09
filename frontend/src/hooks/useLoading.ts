import { useCallback, useState } from "react";

export default function useLoading(initialValue = false) {
    const [isLoading, setIsLoading] = useState<boolean>(initialValue);

    const startLoading = useCallback(() => setIsLoading(true), []);
    const stopLoading = useCallback(() => setIsLoading(false), []);

    const withLoading = useCallback(
        async <T>(operation: () => Promise<T>): Promise<T> => {
            startLoading();
            try {
                return await operation();
            } finally {
                stopLoading();
            }
        },
        [startLoading, stopLoading],
    );

    return {
        isLoading,
        setIsLoading,
        startLoading,
        stopLoading,
        withLoading,
    };
}