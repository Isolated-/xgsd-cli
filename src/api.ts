import {createConfig, bootstrap, ProcessExecutor, DefaultOrchestrator, composePresetWithOpts} from '@xgsd/runtime'
import Fastify from 'fastify'
import {join} from 'path'
import {defaultPreset} from './presets/default.preset'

export function createApi(opts: {
  projectPath: string
  configName: string
  usageFlag?: boolean
  apiKey?: string
  logs?: boolean
}) {
  const {projectPath, configName} = opts
  const app = Fastify({logger: opts.logs})
  const start = performance.now()

  const packageJsonPath = join(projectPath, 'package.json')
  const configPath = join(projectPath, configName)

  const config = createConfig({
    packageJsonPath,
    configPath,
    validator: (input) => input,
  })

  function authenticate(headers?: Record<string, any>, token?: string): boolean {
    if (!token) return true

    if (!headers || !headers['authorization']) return false
    const [_, bearer] = headers['authorization'].split(' ').map((p: string) => p.trim())

    return bearer === token
  }

  let runs = 0

  app.get('/info', async (req, res) => {
    if (!authenticate(req.headers, opts.apiKey)) {
      return res.status(401).send({error: 'invalid_api_key'})
    }

    return res.status(200).send({
      projectPath,
      configPath,
      runs,
      name: config.name,
      entry: config.entry,
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
      data: req.body as any,
    })

    runs++
    return result
  })

  return app
}
