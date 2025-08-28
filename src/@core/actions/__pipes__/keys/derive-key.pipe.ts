import {TransformPipe} from '../../../generics/pipe.generic'
import {DeriveKeyFromMaster} from '../../keys/derive-key-from-master.action'

export class DeriveKeyPipe extends TransformPipe {
  constructor() {
    super(new DeriveKeyFromMaster())
  }
}
