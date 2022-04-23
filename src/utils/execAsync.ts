import { ExecOptions, exec } from 'node:child_process'

export type ExecAsyncFn = {
  (command: string, options?: ExecOptions): Promise<string>
  mockContext(options: ExecOptions): void
  restoreContext(): void
  contextOptions: ExecOptions
}

const DEFAULT_CONTEXT: Partial<ExecOptions> = {
  cwd: process.cwd(),
}

export const execAsync = <ExecAsyncFn>((command, options = {}) => {
  return new Promise((resolve, reject) => {
    const io = exec(
      command,
      {
        ...execAsync.contextOptions,
        ...options,
      },
      (error, stdout, stderr) => {
        console.log({ command, error, stderr, stdout })
      }
    )

    let data = ''
    let error = ''

    io.once('error', (error) => reject(error))

    io.stdout?.on('data', (chunk) => (data += chunk))
    io.stderr?.on('data', (chunk) => (error += chunk))

    io.once('exit', (code) => {
      if (code && code !== 0) {
        return reject(new Error(error))
      }

      resolve(data)
    })
  })
})

execAsync.mockContext = (options) => {
  execAsync.contextOptions = options
}

execAsync.restoreContext = () => {
  execAsync.contextOptions = DEFAULT_CONTEXT
}

execAsync.restoreContext()
