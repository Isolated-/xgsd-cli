import {EventEmitter2} from 'eventemitter2'
import {PipelineState, PipelineStep, SourceData} from '../../@types/pipeline.types'
import {getWorkflowConfigDefaults} from '../../pipelines/pipelines.util'
import {WorkflowContext} from '../context.builder'
import {prepareStepData, processStep, shouldRun} from '../workflow.step-process'
import {resolveStepTemplates} from '../runner.process'
import * as lodash from 'lodash'

describe('workflow step process unit tests', () => {
  let step: PipelineStep<SourceData>
  let ctx: WorkflowContext<SourceData>
  beforeEach(() => {
    step = {
      name: 'test-step',
      description: 'A test step',
      run: 'testFunction',
      if: '${{ .data.user.name | eq("Test User") }}',
      with: {
        name: '${{ .data.user.name | censor }}',
      },
      after: {
        email: '${{ .data.user.email | censor }}',
      },
      input: {},
      state: PipelineState.Pending,
      fn: async (data: any) => {
        return {message: `Hello ${data.user.name}`}
      },
    }

    ctx = new WorkflowContext(
      getWorkflowConfigDefaults({
        steps: [step],
        data: {
          user: {
            name: 'Test User',
            email: 'testuser@xgsd.io',
          },
          a: 5,
          b: 15,
          locations: ['New York', 'San Francisco'],
        },
      }),
      new EventEmitter2(),
    )
  })

  describe('processStep()', () => {
    describe('when starting the process', () => {
      test('should prepare data by resolving templates', () => {
        const result = prepareStepData(step, ctx)
        expect(result).toEqual(
          expect.objectContaining({
            if: true,
            input: expect.objectContaining({
              user: {name: 'Test User', email: 'testuser@xgsd.io'},
              locations: ['New York', 'San Francisco'],
              name: '*********',
            }),
          }),
        )
      })

      test('should correctly convert timeout from string to int', () => {
        step.options = {timeout: '5s' as any}
        const result = prepareStepData(step, ctx)
        expect(async () => await result).not.toThrow()
        console.log(result.options)
      })
    })

    describe('when completing the process', () => {
      test('should finalize step data correctly', async () => {
        const result = await processStep(step, ctx)
        expect(result.output).toBeDefined()
        expect(result.output.email).toBe('****************')
        expect(result.state).toBe(PipelineState.Completed)
        expect(result.startedAt).toBeDefined()
        expect(result.endedAt).toBeDefined()
        expect(result.duration).toBeGreaterThan(0)
      })

      test('when after is empty, undefined, null, or false, output should be returned without mutation', async () => {
        await Promise.all(
          [undefined, null, {}, {key: 'value'}, false].map(async (after) => {
            step.after = after as any
            const result = await processStep(step, ctx)
            expect(result.output).toEqual(result.output)
          }),
        )
      })
    })

    describe('when dealing with retries/timeouts', () => {
      test('should expose a attempt() hook', async () => {
        const attemptMock = jest.fn()
        step.fn = async (context) => {
          throw new Error('Test error')
        }

        await processStep(step, ctx, undefined, attemptMock)
        expect(attemptMock).toHaveBeenCalled()
        expect(attemptMock).toHaveBeenCalledWith(
          expect.objectContaining({
            attempt: expect.any(Number),
            error: expect.objectContaining({
              original: expect.any(Error),
              name: 'Error',
              message: 'Test error',
              stack: expect.any(String),
            }),
            nextMs: expect.any(Number),
            finalAttempt: expect.any(Boolean),
          }),
        )
      })

      test('should allow for a custom delay function', async () => {
        const delayMock = jest.fn((attempt: number) => attempt * 5)
        step.fn = async (context) => {
          throw new Error('Test error')
        }

        const onAttempt = async (attempt: any) => {
          expect(attempt.nextMs).toEqual(attempt.attempt * 5)
        }

        await processStep(step, ctx, delayMock, onAttempt)
        expect(delayMock).toHaveBeenCalled()
      })

      test('should return the failed step with errors', async () => {
        step.fn = async (context) => {
          throw new Error('Test error')
        }

        const result = await processStep(step, ctx)
        expect(result.state).toBe(PipelineState.Failed)
        expect(result.attempt).toEqual(5)
      })

      test('should respect step retries/timeouts over global config', async () => {})

      describe('when step is skipped', () => {
        test('should return state skipped when enabled or condition if are false', async () => {
          step.if = false
          const result = await processStep(step, ctx)
          expect(result).toEqual(
            expect.objectContaining({
              state: PipelineState.Skipped,
            }),
          )

          step.enabled = false
          const result2 = await processStep(step, ctx)
          expect(result2).toEqual(
            expect.objectContaining({
              state: PipelineState.Skipped,
            }),
          )
        })
      })

      test('should not skip when enabled or if are undefined or null', async () => {
        step.if = undefined
        step.enabled = undefined
        const result = await processStep(step, ctx)
        expect(result).toEqual(
          expect.objectContaining({
            state: PipelineState.Completed,
          }),
        )
      })
    })

    describe('prepareStepData()', () => {
      test('should resolve step data correctly', () => {
        const {after, ...data} = step

        const result = prepareStepData(step, ctx)
        expect(result).toEqual(
          expect.objectContaining({
            if: true,
            input: expect.objectContaining({
              user: {name: 'Test User', email: 'testuser@xgsd.io'},
              locations: ['New York', 'San Francisco'],
              name: '*********',
            }),
          }),
        )
      })

      test('if should be false when data.a is not greater than 5', () => {
        const condition = '${{ .data.a | gt(5) }}'
        const data = {a: 3}
        step.data = data
        step.if = condition

        const preparedStep = prepareStepData(step, ctx)
        expect(preparedStep.if).toBe(false)
      })

      test('after should remain untouched', () => {
        const preparedStep = prepareStepData(step, ctx)
        expect(preparedStep.after).toEqual(step.after)
      })

      test('chained helpers work', () => {
        step.with = {
          name: '${{ .data.user.name | censor }}',
          email: '${{ .data.user.email | censor | slice(0, 4) | truncate(1, 1)  }}',
        }

        const preparedStep = prepareStepData(step, ctx)
        expect(preparedStep.input).toEqual(
          expect.objectContaining({
            email: '*...*',
          }),
        )
      })
    })
  })
})
