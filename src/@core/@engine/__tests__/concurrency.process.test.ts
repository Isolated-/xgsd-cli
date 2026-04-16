import {runWithConcurrency} from '../process/concurrency.process'

describe('runWithConcurrency()', () => {
  test('should process items with concurrency limit', async () => {
    const items = [1, 2, 3, 4, 5]
    const limit = 2
    const processed: number[] = []
    const worker = async (item: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          processed.push(item)
          resolve()
        }, 100)
      })
    }

    await runWithConcurrency(items, limit, worker)

    expect(processed).toEqual(items)
  })

  test('respects concurrency limit', async () => {
    const items = Array.from({length: 5}, (_, i) => i)
    const concurrent: number[] = []
    let maxConcurrent = 0

    await runWithConcurrency(items, 2, async (item) => {
      concurrent.push(item)
      maxConcurrent = Math.max(maxConcurrent, concurrent.length)
      // simulate async delay
      await new Promise((r) => setTimeout(r, 50))
      concurrent.pop()
    })

    expect(maxConcurrent).toBeLessThanOrEqual(2)
  })

  test('propagates errors', async () => {
    const items = [1, 2, 3]

    await expect(
      runWithConcurrency(items, 2, async (item) => {
        if (item === 2) throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
  })

  test('runs tasks concurrently when limit > 1', async () => {
    const items = [1, 2, 3, 4]
    let active = 0
    let maxActive = 0

    await runWithConcurrency(items, 2, async () => {
      active++
      maxActive = Math.max(maxActive, active)

      await new Promise((r) => setTimeout(r, 20)) // simulate work

      active--
    })

    expect(maxActive).toBeGreaterThan(1) // proved concurrency
    expect(maxActive).toBeLessThanOrEqual(2) // never above the limit
  })

  test('waits for all tasks to finish before resolving', async () => {
    const items = [1, 2, 3]
    const completed: number[] = []

    const worker = async (item: number) => {
      await new Promise((r) => setTimeout(r, 30 * item)) // staggered finish
      completed.push(item)
    }

    const start = Date.now()
    await runWithConcurrency(items, 2, worker)
    const elapsed = Date.now() - start

    // All items should be processed
    expect(completed.sort()).toEqual(items)

    // The function should have waited at least as long as the slowest task
    expect(elapsed).toBeGreaterThanOrEqual(90)
  })
})
