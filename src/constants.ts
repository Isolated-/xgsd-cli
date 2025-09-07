import chalk from 'chalk'

export const userLogThemes: {[key: string]: (msg: string) => string} = {
  user: chalk.cyan,
  error: chalk.red,
  fail: chalk.red,
  retry: chalk.red,
  warn: chalk.yellow,
  success: chalk.green,
  status: chalk.magenta,
  info: chalk.whiteBright,
}
