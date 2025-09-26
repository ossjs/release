import { execAsync } from '../exec-async.js'

it('resolves with stdout of the executed command', async () => {
  expect(await execAsync('echo "hello world"')).toEqual({
    stdout: 'hello world\n',
    stderr: '',
  })
})

it('rejects if the command exits', async () => {
  await expect(execAsync('exit 1')).rejects.toThrow('Command failed: exit 1\n')
})

it('rejects if the command fails', async () => {
  await expect(execAsync('open foo.txt')).rejects.toThrow(
    'Command failed: open foo.txt',
  )
})

it('propagates environmental variables', async () => {
  const std = await execAsync(`echo "hello $OBJECT"`, {
    env: {
      OBJECT: 'world',
    },
  })

  expect(std).toEqual({
    stdout: 'hello world\n',
    stderr: '',
  })
})
