import fetch from 'node-fetch'
import { format } from 'outvariant'
import { getInfo } from '../../utils/git/getInfo'
import { ParsedCommitWithHash } from '../git/parseCommits'
import { log } from '../../logger'

export async function getCommitAuthors(
  commit: ParsedCommitWithHash,
): Promise<Set<string>> {
  // Extract all GitHub issue references from this commit.
  const issueRefs: Set<string> = new Set()
  for (const ref of commit.references) {
    if (ref.issue) {
      issueRefs.add(ref.issue)
    }
  }

  if (issueRefs.size === 0) {
    return new Set()
  }

  const repo = await getInfo()
  const queue: Promise<void>[] = []
  const authors: Set<string> = new Set()

  for (const issueId of issueRefs) {
    const authorLoginPromise = new Promise<void>(async (resolve, reject) => {
      const response = await fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.name}/issues/${issueId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          },
        },
      )

      if (!response.ok) {
        return reject(
          new Error(format('GitHub API responded with %d.', response.status)),
        )
      }

      const detail = await response.json()

      // Skip issue references that are not pull requests.
      if (!detail.pull_request || !detail.user?.login) {
        return resolve()
      }

      authors.add(detail.user.login)
      resolve()
    })

    queue.push(
      authorLoginPromise.catch((error: Error) => {
        log.error(
          format(
            'Failed to extract the authors for the issue #%d:',
            issueId,
            error.message,
          ),
        )
      }),
    )
  }

  // Extract author GitHub handles in parallel.
  await Promise.allSettled(queue)

  return authors
}
