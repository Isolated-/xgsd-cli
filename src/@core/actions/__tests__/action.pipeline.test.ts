import {ActionData, IAction, RunContext} from '../../generics/action.generic'
import {IPipe, PipeFn} from '../../generics/pipe.generic'
import {IPipelineStep} from '../../generics/pipeline.generic'
import {pipes} from '../action.pipeline'

class TestAction implements IAction<ActionData> {
  id: string = 'test-action'
  run<R = ActionData>(ctx: RunContext): Promise<R> {
    throw new Error('Method not implemented.')
  }

  cancel(): void {
    throw new Error('Method not implemented.')
  }
}

class TestActionPipe extends TestAction implements IPipe {
  pipe(data: any, previous: IPipelineStep | null, next: PipeFn): Promise<IPipelineStep | null> {
    return next(
      {
        ...data,
        addedByTestAction: true,
      },
      previous,
    )
  }
}

describe('pipeline unit tests', () => {
  it('pipe should mutate data correctly (next step can erase first step data -> not result)', async () => {
    const pipeline = pipes(new TestActionPipe())
    const results = await pipeline.run({
      addedByTest: true,
    })

    expect(results).toHaveLength(1)
    expect(results[0].result).toEqual({
      addedByTest: true,
      addedByTestAction: true,
    })
  })

  test('should call the pipe correctly', async () => {
    const pipe = new TestActionPipe()
    const pipeline = pipes(pipe)
    jest.spyOn(pipe, 'pipe').mockImplementationOnce((data, previous, next) => {
      expect(data).toEqual({addedByTest: true})
      expect(previous).toBeNull()
      return next({...data, addedByTestAction: true}, previous)
    })

    await pipeline.run({
      addedByTest: true,
    })

    expect(pipe.pipe).toHaveBeenCalledTimes(1)
    expect(pipe.pipe).toHaveBeenCalledWith({addedByTest: true}, null, expect.any(Function))
  })
})
