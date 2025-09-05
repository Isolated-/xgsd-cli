import chalk from 'chalk'

export const userLogThemes: {[key: string]: (msg: string) => string} = {
  user: chalk.bold.cyan,
  error: chalk.bold.red,
  fail: chalk.bold.red,
  retry: chalk.bold.red,
  warn: chalk.bold.yellow,
  success: chalk.bold.green,
  status: chalk.bold.magenta,
  info: chalk.bold.blue,
}
