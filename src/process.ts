import {initialiseBootstrap} from './shared'

const {XGSD_PROJECT_PATH, XGSD_PROCESS_CONFIG, XGSD_ACTIVATION} = process.env

const projectPath = XGSD_PROJECT_PATH!
const opts = JSON.parse(XGSD_PROCESS_CONFIG!)
const activation = XGSD_ACTIVATION!

initialiseBootstrap(projectPath, opts, activation)
  .then(async (result) => {
    //console.log(result)

    // allow microtasks / flush hooks
    await new Promise((r) => setImmediate(r))

    process.send?.({type: 'XGSD_DONE', result})

    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
