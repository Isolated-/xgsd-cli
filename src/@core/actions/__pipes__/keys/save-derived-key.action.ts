import {TransformPipe, IPipe, PipeFn} from '../../../generics/pipe.generic'
import {IPipelineStep} from '../../../generics/pipeline.generic'
import {SaveDerivedKey} from '../../keys/save-derived-key.action'

export class UpdateKeyStorePipe extends TransformPipe {
  constructor() {
    super(new SaveDerivedKey())
  }
}
