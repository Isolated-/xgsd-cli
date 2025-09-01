import {IRunnable} from '../@shared/interfaces/runnable.interface'

export type ActionData<T> = {
  payload: T | null
}

export type ActionResult<T, E = Error> = {
  data: T | null
  error: E | null
}
