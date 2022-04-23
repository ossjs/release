import { execAsync } from '../execAsync'

it('works', async () => {
  const cmd = `echo "hello $OBJECT"`
  const data = await execAsync(cmd, {
    env: {
      OBJECT: 'world',
    },
  })

  expect(data).toBe('hello world\n')
})
