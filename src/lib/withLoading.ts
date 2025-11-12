/**
 * Utility function to wrap any async function with loading state management.
 * Automatically calls startLoading/stopLoading from the LoadingContext.
 *
 * This should be used when you have access to the loading context.
 * For components, prefer using the `withLoading` method from `useLoading()` hook.
 *
 * @example
 * ```ts
 * const { withLoading } = useLoading()
 * const result = await withLoading(fetchData())
 * ```
 *
 * @example
 * ```ts
 * // In a component
 * const { withLoading } = useLoading()
 * const handleSubmit = async () => {
 *   await withLoading(submitForm())
 * }
 * ```
 */

// This is a type-only export for documentation
// The actual implementation is in LoadingProvider
export type { }

