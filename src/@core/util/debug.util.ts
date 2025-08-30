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
