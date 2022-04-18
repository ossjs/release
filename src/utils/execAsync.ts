import { exec } from 'node:child_process'

export function execAsync(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        return reject(error)
      }

      resolve(stdout)
    })
  })
}
