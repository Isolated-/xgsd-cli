import {resolveDependencyWithWarning} from './util'
import {defaultPreset} from './presets/default.preset'
import {debugPreset} from './presets/debug.preset'
import {developmentPreset} from './presets/development.preset'

const {XGSD_PROJECT_PATH, XGSD_PROCESS_CONFIG, XGSD_SPAN_START} = process.env

const projectPath = XGSD_PROJECT_PATH!
const opts = JSON.parse(XGSD_PROCESS_CONFIG!)

async function main() {
  const {bootstrap, composePresetWithOpts} = resolveDependencyWithWarning('@xgsd/runtime', projectPath)

  const presets = [defaultPreset]

  if (opts.runtime?.debug) {
    presets.push(debugPreset)
  }

  if (!opts.runtime?.process.enabled) {
    presets.push(developmentPreset)
  }

  const result = await bootstrap({
    projectPath,
    config: opts.config,
    activation: 'cli',
    preset: composePresetWithOpts({
      presets,
      opts: {
        metrics: opts.metrics?.enabled,
        createReport: opts.runtime?.save,
        debug: opts.runtime?.debug,
      },
    }),
  })

  return result
}
main()
  .then(async (result) => {
    //console.log(result)

    // allow microtasks / flush hooks
    await new Promise((r) => setImmediate(r))

    process.send?.({type: 'XGSD_DONE', result})

    //process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
