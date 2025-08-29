export type RunFn<T, R> = (data: T) => Promise<R> | R | null | void

export interface IRunnable<T, R> {
  run: RunFn<T, R>
}
