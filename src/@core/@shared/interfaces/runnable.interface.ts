export interface IRunnable<T, R> {
  run(data: T): Promise<R> | R | null | void
}
