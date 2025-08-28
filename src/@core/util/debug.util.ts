export const debug = (message: string, context: string = 'unknown') => {
  if (process.env.DEBUG || process.env.DETAIL) {
    console.debug(`(${context}) ${message}`)
  }
}
