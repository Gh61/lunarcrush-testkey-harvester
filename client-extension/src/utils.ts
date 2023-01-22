export async function retryOperation<T>(
    operation: () => (Promise<T> | T), delayMs: number, times: number): Promise<T> {
    try {
        return await operation();
    } catch (ex) {
        if (times > 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return retryOperation(operation, delayMs, times - 1);
        } else {
            throw ex;
        }
    }
}