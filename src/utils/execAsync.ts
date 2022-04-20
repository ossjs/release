import { ExecOptions, exec } from 'node:child_process'

export function execAsync(
  command: string,
  options?: ExecOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr)
        return reject(error)
      }

      resolve(stdout.toString('utf8'))
    })
  })
}
