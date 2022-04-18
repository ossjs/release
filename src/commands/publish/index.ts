import { Command } from '@oclif/core'

export default class Publish extends Command {
  static description = 'Publish a new version of the project'

  async run(): Promise<void> {
    const latestRelease = getLatestRelease()
  }
}

interface ReleasePointer {
  tag: string
  commitHash: string
}

function getLatestRelease(): ReleasePointer | null {
  return null
}
