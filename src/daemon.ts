import {startDaemon} from './api'

startDaemon({
  apiKey: process.env.XGSD_API_KEY,
  port: Number(process.env.XGSD_PORT),
  host: process.env.XGSD_HOST,
  pidPath: process.env.XGSD_PID_PATH!,
  cwd: process.env.XGSD_CWD!,
})
