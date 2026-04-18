import {Block} from '../../types/block.types'
import {Logger, LoggerEvent} from '../../types/interfaces/logger.interface'
import {Plugin} from '../../types/interfaces/plugin.interface'
import {Reporter} from '../../types/interfaces/reporter.interface'
import {ProjectContext} from '../../types/project.types'
import {RetryAttempt} from '../../types/retry.types'
import {PluginManager} from '../plugins/plugin.manager'
import {SetupContainer} from '../setup'

class MockPlugin implements Plugin {}
class MockLogger implements Logger {
  log(event: LoggerEvent<unknown>): Promise<void> | void {
    throw new Error('Method not implemented.')
  }
}
class MockReporter implements Reporter {}

test('.use() should accept plugins correctly', () => {})
