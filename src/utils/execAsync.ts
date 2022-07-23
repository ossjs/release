import { ExecOptions, exec, spawn } from 'node:child_process'

export type ExecAsyncFn = {
  (command: string, options?: ExecOptions): Promise<string>
  mockContext(options: ExecOptions): void
  restoreContext(): void
  contextOptions: ExecOptions
}

const DEFAULT_CONTEXT: Partial<ExecOptions> = {
  cwd: process.cwd(),
}

export const spawnAsync = (command: string, options = {}) => {
  const [binary, ...args] = command.split(' ')

  const io = spawn(binary, args, {
    ...execAsync.contextOptions,
    ...options,
    stdio: 'pipe',
  })

  let stdout = ''
  io.stdout.on('data', (chunk) => (stdout += chunk))

  let stderr = ''
  io.stderr.on('data', (chunk) => (stderr += chunk))

  return new Promise<{
    stdout: string
    stderr: string
  }>((resolve, reject) => {
    io.on('error', (error) => reject(error))
    io.on('exit', (code) => {
      if (code === 0) {
        return resolve({
          stdout,
          stderr,
        })
      }

      reject(new Error(`Process exited with code ${code}`))
    })
  })
}

//

export const execAsync = <ExecAsyncFn>((command, options = {}) => {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        ...execAsync.contextOptions,
        ...options,
      },
      (error, stdout) => {
        if (error) {
          return reject(error)
        }

        resolve(stdout)
      },
    )
  })
})

execAsync.mockContext = (options) => {
  execAsync.contextOptions = options
}

execAsync.restoreContext = () => {
  execAsync.contextOptions = DEFAULT_CONTEXT
}

execAsync.restoreContext()
