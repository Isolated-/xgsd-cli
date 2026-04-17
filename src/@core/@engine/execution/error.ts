export type WrappedError<T extends Error = Error> = {
  original: T
  name: string
  message: string
  stack?: string
}
