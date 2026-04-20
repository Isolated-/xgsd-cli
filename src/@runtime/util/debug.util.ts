import chalk from 'chalk'

export const debug = (message: string, context?: string, action?: string, data?: object) => {
  if (!process.env.DEBUG && !process.env.DETAIL) {
    return
  }

  let log = `(${action || 'info'}) ${message}`

  if (context) {
    log = log + ` [${context}]`
  }

  if (data) {
    log = log + ` - ${JSON.stringify(data)}`
  }

  console.log(log)
}

export const time = (label: string, fn: () => any) => {
  if (!process.env.DEBUG && !process.env.DETAIL) {
    return fn()
  }

  console.time(label)
  const result = fn()
  console.timeEnd(label)
  return result
}

export const getObjectProfileSize = (object: any) => {
  const buf = Buffer.from(JSON.stringify(object), 'utf-8')
  return buf.length
}
