import {InProcessExecutor} from '@xgsd/runtime'

export function developmentPreset() {
  return {
    executor: InProcessExecutor,
  }
}
