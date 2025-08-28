import {EventEmitter2} from 'eventemitter2'
import {ActionError, IAction, IActionRuntime, RunContext, RunResult} from '../generics/action.generic'
import {debug} from '../util/debug.util'

export class ActionRuntime implements IActionRuntime {
  event: EventEmitter2
  context: RunContext<unknown>
  action: IAction<unknown>
  cancelled: boolean = false

  private constructor(event: EventEmitter2, action: IAction<unknown>, ctx?: Partial<RunContext<unknown>>) {
    this.event = event
    this.context = {
      progress: 0,
      data: null,
      retries: 0,
      max: 10,
      errors: [],
      update: () => {},
      cancel: () => {},
      retry: async (max: number) => this.retry(max),
      ...ctx,
    }

    this.action = action
  }

  details(): string[] {
    return this.context.errors?.map((e) => e.message.replace('Error: ', '')) || []
  }

  static createWithAction(action: IAction<unknown>, opts?: Partial<RunContext<unknown>>): IActionRuntime<unknown> {
    const event = new EventEmitter2()
    const ctx = {
      progress: 0,
      data: null,
      ...opts,
    }

    return new ActionRuntime(event, action, ctx)
  }

  async execute(data: unknown): Promise<RunResult<unknown>> {
    this.context = {...this.context, data}
    this.event.emit('start', this.context)

    debug(
      `(execute) executing action ${this.action.id}, attempt: ${this.context.retries}, max: ${
        this.context.max
      }, has data: ${data !== undefined && data !== null ? 'yes' : 'no'}.`,
      ActionRuntime.name,
    )

    if (this.cancelled) {
      return {
        failed: false,
        success: false,
        data: this.context.data,
        cancelled: true,
        errors: this.context.errors,
        retries: this.context.retries,
        max: this.context.max,
      }
    }

    this.context.data = data
    const update = (message?: string, progress?: number, total?: number) => {
      this.context = {...this.context, progress: progress ?? 0, total}
      this.event.emit('progress', 'progress', this.context)
    }

    try {
      const result = await this.action.run({
        ...this.context,
        data,
        update,
      })

      const runResult = {
        success: !!result,
        failed: false,
        data: result,
        errors: null,
        retries: this.context.retries,
        max: this.context.max,
      }

      this.context.data = result

      this.event.emit('complete', runResult)

      debug(`(execute) completed action ${this.action.id}, in attempts: ${this.context.retries}.`, ActionRuntime.name)

      return runResult
    } catch (error) {
      this.context.errors = [...(this.context.errors ?? []), error as ActionError]
      this.event.emit('fail', this.context)

      debug(
        `(execute) failed to execute action ${this.action.id}, attempt: ${this.context.retries}/${this.context.max}.`,
        ActionRuntime.name,
      )

      return this.retry()
    }
  }

  async cancel(): Promise<void> {
    this.action.cancel()
    this.event.emit('cancelled', this.context)
    this.cancelled = true
  }

  async retry(max: number = 10, delay?: (attempt: number) => number): Promise<RunResult<unknown>> {
    this.context.retries = this.context.retries! + 1
    this.context.max = max

    if (this.context.retries! > this.context.max!) {
      return {
        failed: true,
        success: false,
        data: null,
        errors: this.context.errors,
        retries: this.context.retries,
        max: this.context.max,
      }
    }

    const delayFn = delay ?? ((attempt: number) => attempt * 100)
    const delayMs = delayFn(this.context.retries!)
    await new Promise((resolve) => setTimeout(resolve, delayMs))

    debug(`(retry) retrying action, attempt ${this.context.retries!} of ${this.context.max!}, timeout: ${delayMs}ms`)
    this.event.emit('progress', 'retry', this.context)

    return this.execute(this.context.data!)
  }
}
