import {BaseError} from './generic/base-error.error'

export const ACTION_ERROR_MAP: {[key: string]: string} = {
  USER_VALIDATION_FAILED: 'User validation failed, check `errors` for more information.',
}

export enum ActionErrorCode {
  USER_VALIDATION_FAILED = 'USER_VALIDATION_FAILED',
}

export class ActionError extends BaseError {
  constructor(public readonly code: ActionErrorCode, public readonly detail?: string) {
    super(ActionError.name, ACTION_ERROR_MAP[code], code)
  }
}
