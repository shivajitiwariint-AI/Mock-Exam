/**
 * Next.js 14-compatible stand-in for `after()` from `next/server`.
 * Schedules work to run after the current tick without blocking the response.
 */
export function after(task: () => Promise<unknown> | unknown): void {
  Promise.resolve()
    .then(task)
    .catch((error) => console.error("[after] background task failed", error));
}
