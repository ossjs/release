import { SpawnOptions, spawn } from 'node:child_process'

export type ExecAsyncFn = {
  (command: string, options?: SpawnOptions): Promise<string>
  mockContext(options: SpawnOptions): void
  restoreContext(): void
  contextOptions: SpawnOptions
}

const DEFAULT_CONTEXT: Partial<SpawnOptions> = {
  cwd: process.cwd(),
}

export const execAsync = <ExecAsyncFn>((command, options = {}) => {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ')

    let out = ''
    const io = spawn(cmd, args, {
      ...execAsync.contextOptions,
      ...options,
    })

    io.once('error', reject)

    io.stderr?.on('data', reject)
    io.stdout?.on('data', (chunk) => {
      out += chunk
    })

    io.once('exit', (code) => {
      if (code !== 0) {
        return reject()
      }

      resolve(out)
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
