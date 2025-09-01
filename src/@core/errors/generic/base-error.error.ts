export abstract class BaseError extends Error {
  isBaseError = true

  constructor(public readonly name: string, public readonly message: string, public readonly code: string) {
    super(message)
  }
}
