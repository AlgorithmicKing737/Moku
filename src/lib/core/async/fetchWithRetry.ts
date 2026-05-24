export interface RetryOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export async function fetchWithRetry<T>(
    fetcher: () => Promise<T>,
    options: RetryOptions = {},
): Promise<T> {
    const {
        maxAttempts = 3,
        baseDelayMs = 500,
        maxDelayMs = 10_000,
        shouldRetry = () => true,
    } = options;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fetcher();
        } catch (error) {
            lastError = error;
            if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
                throw error;
            }

            const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}
