import { execAsync } from '../execAsync'

export interface CommitOptions {
  files: string[]
  message: string
}

export async function commit({ files, message }: CommitOptions): Promise<void> {
  await execAsync(`git add ${files.join(' ')}`)
  await execAsync(`git commit -m '${message}'`)
}
