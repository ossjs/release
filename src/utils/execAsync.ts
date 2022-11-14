import { DeferredPromise } from '@open-draft/deferred-promise'
import { type ExecOptions, exec } from 'child_process'

export type ExecAsyncFn = {
  (
    command: string,
    options?: ExecOptions,
  ): DeferredPromise<ExecAsyncPromisePayload>
  mockContext(options: ExecOptions): void
  restoreContext(): void
  contextOptions: ExecOptions
}

export interface ExecAsyncPromisePayload {
  stdout: string
  stderr: string
}

const DEFAULT_CONTEXT: Partial<ExecOptions> = {
  cwd: process.cwd(),
}

export const execAsync = <ExecAsyncFn>((command, options = {}) => {
  const donePromise = new DeferredPromise<{
    stdout: string
    stderr: string
  }>()

  exec(
    command,
    {
      ...execAsync.contextOptions,
      ...options,
    },
    (error, stdout, stderr) => {
      if (error) {
        donePromise.reject(error)
        return
      }

      donePromise.resolve({
        stdout,
        stderr,
      })
    },
  )

  return donePromise
})

execAsync.mockContext = (options) => {
  execAsync.contextOptions = options
}

execAsync.restoreContext = () => {
  execAsync.contextOptions = DEFAULT_CONTEXT
}

execAsync.restoreContext()
