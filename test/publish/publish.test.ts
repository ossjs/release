import * as path from 'path'
import { createTeardown } from 'fs-teardown'
import { initGit } from '../utils'

const cli = path.resolve(__dirname, '../..', 'bin/index.js')

const fsMock = createTeardown({
  rootDir: 'publish',
})

beforeAll(async () => {
  await fsMock.prepare()
})

beforeEach(async () => {
  await fsMock.reset()
})

afterAll(async () => {
  await fsMock.cleanup()
})

it('publishes a minor version', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'test',
      version: '0.0.0',
    }),
    'tarn.config.js': `
module.exports = {
  script: 'echo 0'
}
    `,
  })
  await initGit(fsMock)

  await fsMock.exec(`git add . && git commit -m 'feat: new things'`)

  const { stderr, stdout } = await fsMock.exec(`${cli} publish`)
  expect(stderr).toBe('')

  console.log(stdout)

  // Must notify about the next version.
  expect(stdout).toContain('next version: 0.0.0 -> 0.1.0')

  // Must bump the "version" in package.json.
  expect(
    JSON.parse(await fsMock.readFile('package.json', 'utf8'))
  ).toHaveProperty('version', '0.1.0')

  expect(await fsMock.exec('git log')).toHaveProperty(
    'stdout',
    expect.stringContaining('chore: release 0.1.0')
  )

  // Must create a new tag for the release.
  expect(await fsMock.exec('git tag')).toHaveProperty(
    'stdout',
    expect.stringContaining('0.1.0')
  )
})
