import chalk from 'chalk'

export const userLogThemes: {[key: string]: (msg: string) => string} = {
  user: chalk.bold.cyan,
  error: chalk.red,
  fail: chalk.bold.red,
  retry: chalk.red,
  warn: chalk.yellow,
  success: chalk.bold.green,
  status: chalk.magenta,
  info: chalk.blue,
}
