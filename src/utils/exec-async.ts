import { type ChildProcess, type ExecOptions, exec } from 'node:child_process'
import { DeferredPromise } from '@open-draft/deferred-promise'

export type ExecAsyncFn = {
  (
    command: string,
    options?: ExecOptions,
  ): DeferredPromiseWithIo<ExecAsyncPromisePayload>

  mockContext(options: ExecOptions): void
  restoreContext(): void
  contextOptions: ExecOptions
}

interface DeferredPromiseWithIo<T> extends DeferredPromise<T> {
  io: ChildProcess
}

export interface ExecAsyncPromisePayload {
  stdout: string
  stderr: string
}

const DEFAULT_CONTEXT: Partial<ExecOptions> = {
  cwd: process.cwd(),
}

export const execAsync = <ExecAsyncFn>((command, options = {}) => {
  const commandPromise = new DeferredPromise<{
    stdout: string
    stderr: string
  }>()

  const io = exec(
    command,
    {
      ...execAsync.contextOptions,
      ...options,
    },
    (error, stdout, stderr) => {
      if (error) {
        return commandPromise.reject(error)
      }

      commandPromise.resolve({
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      })
    },
  )

  // Set the reference to the spawned child process
  // on the promise so the consumer can either await
  // the entire command or tap into child process
  // and handle it manually (e.g. forward stdio).
  Reflect.set(commandPromise, 'io', io)

  return commandPromise
})

execAsync.mockContext = (options) => {
  execAsync.contextOptions = options
}

execAsync.restoreContext = () => {
  execAsync.contextOptions = DEFAULT_CONTEXT
}

execAsync.restoreContext()
