import {InProcessExecutor} from '../sdk'

export function developmentPreset() {
  return {
    executor: InProcessExecutor,
  }
}
