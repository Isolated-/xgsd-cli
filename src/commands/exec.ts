import {Args, Command, Flags} from '@oclif/core'
import {execSync, spawn} from 'child_process'
import {existsSync, readdirSync, statSync} from 'fs-extra'
import path = require('path')

import * as which from 'which'

function ensureDockerInstalled(): void {
  try {
    which.sync('docker')
  } catch {
    throw new Error(
      'Docker is not installed or not in PATH. Please install Docker first: https://docs.docker.com/get-docker/',
    )
  }
}

function ensureDockerRunning(): void {
  try {
    execSync('docker info', {stdio: 'ignore'})
  } catch {
    throw new Error('Docker is installed but the daemon is not running. Start Docker and try again.')
  }
}

export function getDockerVersion(): {client: string; server: string} {
  try {
    const client = execSync('docker --version', {encoding: 'utf-8'}).trim()

    let server = 'unknown'
    try {
      server = execSync("docker version --format '{{.Server.Version}}'", {encoding: 'utf-8'}).trim()
    } catch {
      // Server not running or unreachable
    }

    return {client, server}
  } catch (err: any) {
    throw new Error('Docker is not installed or not available in PATH')
  }
}

function downloadDockerfile(dest: string): void {
  const url = 'https://xgsd-cli.ams3.cdn.digitaloceanspaces.com/Dockerfile'
  execSync(`curl -fsSL ${url} -o ${dest}`, {stdio: 'ignore'})
}

function ensureImageExists(watch: boolean = false): void {
  try {
    // Check if image exists
    execSync('docker image inspect xgsd:v1', {stdio: 'ignore'})
  } catch {
    const cliPath = path.resolve(__dirname, '../../')
    const dockerfilePath = path.join(cliPath, 'Dockerfile')
    if (!existsSync(dockerfilePath)) {
      downloadDockerfile(dockerfilePath)
    }

    execSync(`docker build -t xgsd:v1 ${cliPath}`, {stdio: watch ? 'inherit' : 'ignore'})
  }
}

export default class Exec extends Command {
  static override args = {
    package: Args.string({description: 'package to run', required: true}),
  }
  static override description =
    'Run a workflow in a Docker container (proof of concept, very limited). Container is removed after exec for each run.'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    confirm: Flags.boolean({char: 'y', description: 'confirm before running'}),
    watch: Flags.boolean({char: 'w', description: 'watch for changes (streams logs to console)'}),

    workflow: Flags.string({char: 'e', description: 'workflow to run'}),
  }

  public async run(): Promise<void> {
    const {
      flags,
      args: {package: packageName},
    } = await this.parse(Exec)

    if (!flags.confirm) {
      this.error(
        'this is a proof of concept and may result in unpredicted behavior, to continue please confirm with --confirm or -y',
      )
    }

    const workflowPath = path.resolve(packageName || '.')
    if (!existsSync(path.join(workflowPath, 'package.json'))) {
      this.error(`No package.json found in ${workflowPath}`)
    }

    ensureDockerInstalled()
    ensureDockerRunning()
    ensureImageExists(flags.watch)

    const args = ['run', '--rm', '-v', `${workflowPath}:/app/workflow`, 'xgsd:v1', 'run', '.']
    if (flags.watch) args.push('--watch')
    if (flags.workflow) args.push('--workflow', flags.workflow)

    const docker = spawn('docker', args, {stdio: 'inherit'})

    docker.stdout?.on('data', (data) => process.stdout.write(data))
    docker.stderr?.on('data', (data) => process.stderr.write(data))

    docker.on('close', (code) => {})

    docker.on('close', async (code) => {
      if (code !== 0) {
        return
      }

      // Collect run results/artifacts
      const runsDir = path.join(workflowPath, 'runs')
      if (existsSync(runsDir)) {
        this.log(`collecting run results from: ${runsDir}.`)
      } else {
        this.log('no runs directory found, container may not have written artifacts')
      }
    })

    let shuttingDown = false
    // Clean shutdown on signals
    process.on('SIGINT', () => {
      if (!shuttingDown) {
        shuttingDown = true
        docker.kill('SIGINT')
      }
    })
    process.on('SIGTERM', () => {
      if (!shuttingDown) {
        shuttingDown = true
        docker.kill('SIGTERM')
      }
    })
  }
}
