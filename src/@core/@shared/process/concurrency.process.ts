export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<any>,
): Promise<void> {
  const executing: Promise<any>[] = []

  for (let i = 0; i < items.length; i++) {
    const p = worker(items[i], i)

    // When finished, remove from executing
    const e = p.then(() => {
      executing.splice(executing.indexOf(e), 1)
    })

    executing.push(e)

    if (executing.length >= limit) {
      await Promise.race(executing)
    }
  }

  await Promise.all(executing)
}
