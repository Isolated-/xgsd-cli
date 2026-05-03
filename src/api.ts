import {createConfig, bootstrap, composePresetWithOpts} from '@xgsd/runtime'
import Fastify from 'fastify'
import {join} from 'path'
import {defaultPreset} from './presets/default.preset'
import {createWriteStream, ensureDirSync, writeFileSync} from 'fs-extra'

type Opts = {
  usageFlag?: boolean
  apiKey?: string
  logs?: boolean
  port?: number
  host?: string
  pidPath: string
}

export async function startDaemon(opts: Opts) {
  const app = createApi(opts)

  const port = opts.port ? opts.port : 3010

  const path = opts.pidPath

  ensureDirSync(path)
  writeFileSync(join(path, 'xgsd.pid'), String(process.pid))

  await app.listen({port, host: opts.host ?? 'localhost'})

  console.log(`[xGSD daemon] running on :${port}`)

  // ---- graceful shutdown ----
  const shutdown = async () => {
    console.log('[xGSD daemon] shutting down...')
    await app.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

export function createApi(opts: Opts) {
  const stream = createWriteStream(join(opts.pidPath, 'server-logs.combined.jsonl'), {flags: 'a'})
  const app = Fastify({
    logger: {
      enabled: true,
      stream,
    },
  })

  const start = performance.now()

  function authenticate(headers?: Record<string, any>, token?: string): boolean {
    if (!token) return true

    if (!headers || !headers['authorization']) return false
    const [_, bearer] = headers['authorization'].split(' ').map((p: string) => p.trim())

    return bearer === token
  }

  let runs = 0
  let errors = 0

  app.get('/info', async (req, res) => {
    return res.status(200).send({
      runs,
      errors,
      memory_usage_heap_used: process.memoryUsage().heapUsed,
      uptime: performance.now() - start,
    })
  })

  app.post('/run', async (req, res) => {
    // TODO: implement validation
    if (req.body && typeof req.body !== 'object') {
      return res.status(400).send({})
    }

    if (!authenticate(req.headers as Record<string, any>, opts.apiKey)) {
      return res.status(401).send({error: 'invalid_api_key'})
    }

    const projectPath = (req.body as any).projectPath
    const packageJsonPath = join(projectPath, 'package.json')
    const configPath = join(projectPath, (req.body as any).configName ?? 'config.yaml')

    const config = createConfig({
      packageJsonPath,
      configPath,
      validator: (input) => input,
    })

    runs++

    try {
      const result = await bootstrap({
        projectPath,
        config,
        activation: 'http',
        preset: composePresetWithOpts({
          presets: [defaultPreset],
          opts: {
            usage: opts.usageFlag ?? config.usage?.enabled ?? false,
          },
        }),
        data: (req.body as any).data,
      })

      return result
    } catch (error) {
      errors++
    }
  })

  return app
}
