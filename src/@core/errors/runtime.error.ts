import {BaseError} from './generic/base-error.error'

export const RUNTIME_ERROR_MAP: {[key: string]: string} = {
  UNKNOWN_ERROR: 'An unknown error occurred during runtime.',
  NOT_CONFIGURED: 'Runtime not configured properly. Check logs, this is a developer issue.',
  INVALID_CONFIG: 'Invalid configuration provided at runtime.',
  MAX_RETRIES_EXCEED: 'Maximum retries exceeded, try again later or try increasing the limit.',
  UNEXPECTED_ERROR_FATAL: 'An unexpected fatal error occurred during runtime.',
}

export enum RuntimeErrorCode {
  UNEXPECTED_ERROR_FATAL = 'UNEXPECTED_ERROR_FATAL',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  MAX_RETRIES_EXCEED = 'MAX_RETRIES_EXCEED',
}

export class RuntimeError extends BaseError {
  constructor(public readonly code: RuntimeErrorCode, public readonly detail?: string[]) {
    if (!RUNTIME_ERROR_MAP[code]) {
      throw new Error(`unknown runtime error code: ${code}`)
    }

    super(RuntimeError.name, RUNTIME_ERROR_MAP[code], code)
  }
}
