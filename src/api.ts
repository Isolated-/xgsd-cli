import {createConfig, bootstrap, composePresetWithOpts, ProjectConfig} from '@xgsd/runtime'
import Fastify, {FastifyReply, FastifyRequest} from 'fastify'
import {join} from 'path'
import {defaultPreset} from './presets/default.preset'
import {createWriteStream, ensureDirSync, writeFileSync} from 'fs-extra'
import {createValidationSchema} from './util'
import {createBundle} from './commands/run'

type Opts = {
  apiKey?: string
  logs?: boolean
  port?: number
  host?: string
  cwd?: string
  pidPath: string
}

let runs = 0
let errors = 0
let running = 0

export async function runProjectHandler(
  opts: {
    projectPath: string
    data: Record<string, any>
  },
  res: FastifyReply,
) {
  const {projectPath, data} = opts

  if (running > 10) {
    return res.status(429).send({error: 'too many running projects'})
  }

  runs++
  running++

  // allow overriding these
  const packageJsonPath = join(projectPath, 'package.json')
  const configPath = join(projectPath, 'config.yaml')
  const schema = createValidationSchema()

  // cache this carefully
  const config = createConfig({
    packageJsonPath,
    configPath,
    validator: (input) => {
      const validation = schema.validate(input)

      if (validation.error) {
        return res.status(400).send({error: 'invalid config', errors: validation.error.details.map((d) => d.message)})
      }

      return validation.value
    },
  })

  config.entry = await createBundle({project: projectPath, entry: config.entry ?? 'index.js'})

  try {
    const result = await bootstrap({
      projectPath,
      config,
      activation: 'http',
      preset: composePresetWithOpts({
        presets: [defaultPreset],
        opts: {
          metrics: config.metrics?.enabled ?? true,
          createReport: true,
        },
      }),
      data,
    })

    running--
    return res.status(200).send(result)
  } catch (error) {
    running--
    errors++
    return res.status(500).send(error)
  }
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

  app.get('/info', async (req, res) => {
    return res.status(200).send({
      runs,
      errors,
      memory_usage_heap_used: process.memoryUsage().heapUsed,
      uptime: performance.now() - start,
    })
  })

  function handler(req: FastifyRequest, res: FastifyReply) {
    if (!authenticate(req.headers, opts.apiKey)) {
      return res.status(401).send({error: 'invalid_api_key'})
    }

    const body = (req.body as any) ?? {}
    if (!body.project) {
      return res.status(400).send({error: '"project" is missing and should be the absolute path to your project'})
    }

    const projectPath = opts.cwd ? join(opts.cwd, body.project) : body.project

    // then run the project
    return runProjectHandler(
      {
        projectPath,
        data: body.data,
      },
      res,
    )
  }

  // routes
  app.post('/v1/run', handler)
  app.post('/run', handler)

  return app
}
