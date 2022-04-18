import { getNextReleaseType } from '../utils/getNextReleaseType'
import { getNextVersion } from '../utils/getNextVersion'
import { getCommits } from '../utils/git/getCommits'
import { getCurrentBranch } from '../utils/git/getCurrentBranch'
import { getLatestRelease } from '../utils/git/getLatestRelease'
import { getTags } from '../utils/git/getTags'

export async function publish(): Promise<void> {
  const branchName = getCurrentBranch()

  const tags = getTags()
  const latestRelease = getLatestRelease(tags)

  const commits = await getCommits({
    after: latestRelease?.hash,
  })

  const nextReleaseType = getNextReleaseType(commits)
  if (!nextReleaseType) {
    return
  }

  const prevVersion = latestRelease?.tag || '0.0.0'
  const nextVersion = getNextVersion(prevVersion, nextReleaseType)

  console.log({ nextVersion })
}
