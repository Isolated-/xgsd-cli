import {startDaemon} from './api'

startDaemon({
  usageFlag: Boolean(process.env.XGSD_USAGE_FLAG),
  apiKey: process.env.XGSD_API_KEY,
  port: Number(process.env.XGSD_PORT),
  host: process.env.XGSD_HOST,
  pidPath: process.env.XGSD_PID_PATH!,
})
