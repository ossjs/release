import fetch from 'node-fetch'
import { format } from 'outvariant'
import { getInfo } from '../../utils/git/getInfo'
import { ParsedCommitWithHash } from '../git/parseCommits'
import { log } from '../../logger'

export interface GetCommitAuthorsQuery {
  repository: {
    pullRequest: {
      url: string
      author: { login: string }
      commits: {
        nodes: Array<{
          commit: {
            authors: {
              nodes: Array<{
                user: { login: string }
              }>
            }
          }
        }>
      }
    }
  }
}

/**
 * Get a list of GitHub usernames who have contributed
 * to the given release commit. This analyzes all the commit
 * authors in the pull request referenced by the given commit.
 */
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

  function addAuthor(login?: string): void {
    if (!login) {
      return
    }
    authors.add(login)
  }

  for (const issueId of issueRefs) {
    const authorLoginPromise = new Promise<void>(async (resolve, reject) => {
      const response = await fetch(`https://api.github.com/graphql`, {
        method: 'POST',
        headers: {
          Agent: 'ossjs/release',
          Accept: 'application/json',
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetCommitAuthors($owner: String!, $repo: String!, $pullRequestId: Int!) {
              repository(owner: $owner name: $repo) {
                pullRequest(number: $pullRequestId) {
                  url
                  author {
                    login
                  }
                  commits(first: 100) {
                    nodes {
                      commit {
                        authors(first: 100) {
                          nodes {
                            user {
                              login
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            `,
          variables: {
            owner: repo.owner,
            repo: repo.name,
            pullRequestId: Number(issueId),
          },
        }),
      })

      if (!response.ok) {
        return reject(
          new Error(format('GitHub API responded with %d.', response.status)),
        )
      }

      const json = await response.json()
      const data = json.data as GetCommitAuthorsQuery

      if (json.errors) {
        return reject(
          new Error(
            format(
              'GitHub API responded with %d error(s): %j',
              json.errors.length,
              json.errors,
            ),
          ),
        )
      }

      // Add pull request author.
      addAuthor(data.repository.pullRequest.author.login)

      // Add each commit author in the pull request.
      for (const commit of data.repository.pullRequest.commits.nodes) {
        for (const author of commit.commit.authors.nodes) {
          addAuthor(author.user.login)
        }
      }

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
