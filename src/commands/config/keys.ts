import {Args, Command, Flags} from '@oclif/core'
import {KeyChain} from '../../@core/keys/keychain'
import {decodeKey, toRawKey} from '../../@core/keys/util'
import {testActionFn} from '../../@core/actions/test.action'
import {runnerFn} from '../../@core/@shared/runner'
import {getDefaultPipelineConfig, pipes, pipeToStep} from '../../@core/pipelines/pipelines.util'
import {join} from 'path'

export default class ConfigKeys extends Command {
  static override args = {
    operation: Args.string({description: 'operation to perform on keys', options: ['generate', 'import']}),
    extra: Args.string({description: 'extra argument for the operation', required: false}),
  }
  static override aliases: string[] = ['keys']
  static override description = 'describe the command here'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    force: Flags.boolean({char: 'f', description: 'force operation without prompt'}),
    raw: Flags.boolean({description: 'output raw key without any formatting'}),
    passphrase: Flags.string({char: 'p', description: 'passphrase to encrypt the key'}),
    recovery: Flags.string({char: 'r', description: 'recovery phrase to recover the key'}),
    words: Flags.integer({char: 'w', description: 'number of words for recovery phrase', default: 24}),
    context: Flags.string({char: 'c', description: 'context for the key', default: 'default'}),
    version: Flags.integer({char: 'v', description: 'version for the key', default: 1}),
  }

  public async generate(
    passphrase: string,
    recovery: string = '',
    words: number,
    raw: boolean = false,
    forced: boolean = false,
    context: string = 'default',
    version: number = 1,
    hook: any,
  ): Promise<void> {
    if (!passphrase) {
      this.error('passphrase must be provided to continue with key generation.')
    }

    const action = testActionFn

    const pipeFn = async (context: any) => {
      const result = await action(context.input.data)
      return context.next({data: result})
    }

    const nextPipeFn = async (context: any) => {
      await new Promise((resolve) => setTimeout(resolve, 15000))
      return context.next({data: 'next result'})
    }

    const finalPipe = async (context: any) => {
      console.log('called')
      return context.next({data: 'final result'}, null)
    }

    const failingPipeFn = async (context: any) => {
      throw new Error('failed pipe')
    }

    const pipeline = pipes(pipeFn, pipeFn, nextPipeFn, failingPipeFn, finalPipe)
    pipeline.config.timeout = 100
    const ctx = await pipeline.run({data: 'payload'})
    console.log(ctx)
  }

  public async import(key: string): Promise<void> {
    const keyChain = KeyChain.fromImportString(key)

    const decoded = decodeKey(key, 'base64url')
    this.log('here is your imported key details:')
    this.log(`version: ${decoded.v}`)
    this.log(`algorithm: ${decoded.alg}`)

    this.log(`success!`)
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ConfigKeys)

    switch (args.operation) {
      case 'generate':
        await this.generate(
          flags.passphrase ?? '',
          flags.recovery,
          flags.words,
          flags.raw,
          flags.force,
          flags.context,
          flags.version,
          flags.hook,
        )
        break
      case 'import':
        if (!args.extra) {
          this.error('Please provide a key to import')
        }
        await this.import(args.extra)
        break
    }
  }
}
