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
      }
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
