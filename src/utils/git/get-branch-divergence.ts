import { execAsync } from '#/src/utils/exec-async.js'

export interface BranchDivergence {
  /**
   * The number of local commits missing from the remote branch.
   */
  ahead: number
  /**
   * The number of remote commits missing from the local branch.
   */
  behind: number
  /**
   * The commit hash the remote branch points to.
   */
  remoteHash: string
}

/**
 * Fetch the given branch from "origin" and compare it to the local HEAD.
 */
export async function getBranchDivergence(
  branch: string,
): Promise<BranchDivergence> {
  await execAsync(`git fetch origin ${branch}`)

  const [{ stdout: counts }, { stdout: remoteHash }] = await Promise.all([
    execAsync(`git rev-list --left-right --count HEAD...origin/${branch}`),
    execAsync(`git rev-parse origin/${branch}`),
  ])
  const [ahead, behind] = counts.trim().split(/\s+/).map(Number)

  return {
    ahead,
    behind,
    remoteHash: remoteHash.trim(),
  }
}
