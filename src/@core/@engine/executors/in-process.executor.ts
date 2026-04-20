import {SourceData} from '@xgsd/engine'
import {Block, Context} from '../../config'
import {processBlock, processStep} from '../process/block.process'
import {Executor} from '../types/generics/executor.interface'

export class InProcessExecutor<T extends SourceData = SourceData> implements Executor<T> {
  async run(block: Block<T>, context: Context<T>): Promise<Block<T>> {
    const event = async (name: string, payload: any) => {
      await context.bus.emit(name, {
        event: name,
        payload: {
          ...payload,
          context,
        },
      })
    }

    //return processStep(block, context, {event})
    return processBlock({
      block,
      ctx: context,
      event,
    }) as any
  }
}
