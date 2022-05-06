import { config } from 'dotenv'
import { testEnvironment } from '../../../../test/env'

const { setup, reset, cleanup, fs } = testEnvironment('set-npm-auth-token')

const { HOME } = process.env
const cwd = process.cwd()

beforeAll(async () => {
  await setup()
  await fs.create({
    '.env': `NPM_TOKEN=MY_SECRET_TOKEN`,
  })

  config({
    path: fs.resolve('.env'),
  })
})

beforeEach(() => {
  const cwd = fs.resolve('.')
  process.env.HOME = cwd
  process.chdir(cwd)
})

afterEach(async () => {
  process.env.HOME = HOME
  process.chdir(cwd)
  await reset()
})

afterAll(async () => {
  await cleanup()
})

it(`creates an ".npmrc" with the "NPM_TOKEN" if it doesn't exist`, async () => {
  const { setNpmAuthToken } = await import('../setNpmAuthToken')
  await setNpmAuthToken()

  expect(await fs.readFile('.npmrc', 'utf8')).toBe(
    '//registry.npmjs.org/:_authToken = ${NPM_TOKEN}',
  )
})

it('updates existing ".npmrc" with the "NPM_TOKEN" env variable', async () => {
  await fs.create({
    '.npmrc': 'always-auth = true',
  })

  const { setNpmAuthToken } = await import('../setNpmAuthToken')
  await setNpmAuthToken()

  expect(await fs.readFile('.npmrc', 'utf8')).toBe(`\
always-auth = true
//registry.npmjs.org/:_authToken = \${NPM_TOKEN}`)
})

it('leaves existing ".npmrc" as-is if it already has "authToken" defined', async () => {
  await fs.create({
    '.npmrc': '//registry.npmjs.org/:_authToken = EXISTING_TOKEN',
  })

  const { setNpmAuthToken } = await import('../setNpmAuthToken')
  await setNpmAuthToken()

  expect(await fs.readFile('.npmrc', 'utf8')).toBe(
    '//registry.npmjs.org/:_authToken = EXISTING_TOKEN',
  )
})

it('updates existing ".npmrc" if it has an "authToken" for a custom registry', async () => {
  await fs.create({
    '.npmrc': '//custom.registry.com/:_authToken = EXISTING_TOKEN',
  })

  const { setNpmAuthToken } = await import('../setNpmAuthToken')
  await setNpmAuthToken()

  expect(await fs.readFile('.npmrc', 'utf8')).toBe(
    `\
//custom.registry.com/:_authToken = EXISTING_TOKEN
//registry.npmjs.org/:_authToken = \${NPM_TOKEN}`,
  )
})
