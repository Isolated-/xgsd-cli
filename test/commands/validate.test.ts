import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('validate', () => {
  it('runs validate cmd', async () => {
    const {stdout} = await runCommand('validate')
    expect(stdout).to.contain('hello world')
  })

  it('runs validate --name oclif', async () => {
    const {stdout} = await runCommand('validate --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
