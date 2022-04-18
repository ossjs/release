import { execAsync } from '../execAsync'

export interface CreateCommitOptions {
  files: string[]
  message: string
}

export async function createCommit({
  files,
  message,
}: CreateCommitOptions): Promise<void> {
  await execAsync(`git add ${files.join(' ')}`)
  await execAsync(`git commit -m '${message}'`)
}
