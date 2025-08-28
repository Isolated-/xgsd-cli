import {IAction} from '../../../generics/action.generic'
import {TransformPipe} from '../../../generics/pipe.generic'
import {GenerateMasterKey} from '../../keys/generate-master-key.action'

export class GenerateMasterKeyPipe extends TransformPipe {
  constructor() {
    super(new GenerateMasterKey())
  }
}
