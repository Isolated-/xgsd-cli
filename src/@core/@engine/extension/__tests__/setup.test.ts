import {PipelineStep} from '../../../@types/pipeline.types'
import {WorkflowContext} from '../../context.builder'
import {InProcessExecutor} from '../../executors/in-process.executor'
import {ProcessExecutor} from '../../executors/process.executor'
import {Block} from '../../types/block.types'
import {Executor} from '../../types/generics/executor.interface'
import {Logger, LoggerEvent} from '../../types/interfaces/logger.interface'
import {Plugin} from '../../types/interfaces/plugin.interface'
import {Reporter} from '../../types/interfaces/reporter.interface'
import {ProjectContext} from '../../types/project.types'
import {RetryAttempt} from '../../types/retry.types'
import {LoggerManager} from '../loggers/logger.manager'
import {PluginManager} from '../plugins/plugin.manager'
import {ReporterManager} from '../reporters/reporter.manager'
import {SetupContainer} from '../setup'

class MockPlugin implements Plugin {}
class MockLogger implements Logger {
  log(event: LoggerEvent<unknown>): Promise<void> | void {
    throw new Error('Method not implemented.')
  }
}
class MockReporter implements Reporter {}
class MockExecutor implements Executor {
  run(block: PipelineStep<unknown>, context: WorkflowContext<unknown>): Promise<PipelineStep<unknown>> {
    throw new Error('Method not implemented.')
  }
}

test('.use() should accept plugins correctly', () => {
  const use = jest.fn()
  const setup = new SetupContainer({
    pluginRegistry: {
      use,
    } as any,
  })

  expect(() => setup.use(MockPlugin)).not.toThrow()

  // ensure setup.use() just passes input without mutation
  expect(use).toHaveBeenCalledTimes(1)
  expect(use).toHaveBeenCalledWith(MockPlugin)
})

test('.logger() should accept loggers correctly', () => {
  const use = jest.fn()
  const setup = new SetupContainer({
    loggerRegistry: {
      use,
    } as any,
  })

  expect(() => setup.logger(MockLogger)).not.toThrow()

  // ensure setup.use() just passes input without mutation
  expect(use).toHaveBeenCalledTimes(1)
  expect(use).toHaveBeenCalledWith(MockLogger)
})

test('.reporter() should accept reporters correctly', () => {
  const use = jest.fn()
  const setup = new SetupContainer({
    reporterRegistry: {
      use,
    } as any,
  })

  expect(() => setup.reporter(MockReporter)).not.toThrow()

  // ensure setup.use() just passes input without mutation
  expect(use).toHaveBeenCalledTimes(1)
  expect(use).toHaveBeenCalledWith(MockReporter)
})

test('.reporter() should accept reporters correctly', () => {
  const use = jest.fn()
  const setup = new SetupContainer({
    reporterRegistry: {
      use,
    } as any,
  })

  expect(() => setup.reporter(MockReporter)).not.toThrow()

  // ensure setup.use() just passes input without mutation
  expect(use).toHaveBeenCalledTimes(1)
  expect(use).toHaveBeenCalledWith(MockReporter)
})

test('.executor() should accept executors correctly', () => {
  const setup = new SetupContainer({})

  expect(() => setup.executor(MockExecutor)).not.toThrow()
})

test('.build() should return { pluginManager, loggerManager, reporterManager, executor }', async () => {
  const setup = new SetupContainer()
  const {pluginManager, loggerManager, reporterManager, executor} = await setup.build({
    config: {lite: true},
  } as any)

  expect(pluginManager).toBeInstanceOf(PluginManager)
  expect(loggerManager).toBeInstanceOf(LoggerManager)
  expect(reporterManager).toBeInstanceOf(ReporterManager)

  expect(executor).toBeInstanceOf(InProcessExecutor)
})

test('.build() returns ProcessExecutor when .lite is false', async () => {
  const setup = new SetupContainer()
  const {executor} = await setup.build({config: {lite: false}} as any)
  expect(executor).toBeInstanceOf(ProcessExecutor)
})

test('.build() returns custom/overriden executor', async () => {
  const setup = new SetupContainer()
  setup.executor(MockExecutor)
  const {executor} = await setup.build({config: {lite: false}} as any)
  expect(executor).toBeInstanceOf(MockExecutor)
})
