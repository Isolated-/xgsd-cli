import {SourceData} from '@xgsd/engine'
import {BlockContext, Context, Block} from '../../../config'

export interface Executor<T extends SourceData = SourceData> {
  run(block: Block<T>, context: Context<T>): Promise<BlockContext<T>>
}
