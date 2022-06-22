import fetch from 'node-fetch'
import createIssueParser from 'issue-parser'
import { getInfo, GitInfo } from '../git/getInfo'
import type { ParsedCommitWithHash } from '../git/parseCommits'

const parser = createIssueParser('github')

function extractIssueIds(text: string, repo: GitInfo): Set<string> {
  const ids = new Set<string>()
  const parsed = parser(text)

  for (const action of parsed.actions.close) {
    if (action.slug == null || action.slug === `${repo.owner}/${repo.name}`) {
      ids.add(action.issue)
    }
  }

  return ids
}

export async function getReleaseRefs(
  commits: ParsedCommitWithHash[],
): Promise<Set<string>> {
  const repo = await getInfo()
  const issueIds = new Set<string>()

  for (const commit of commits) {
    // Extract issue ids from the commit messages.
    for (const ref of commit.references) {
      if (ref.issue) {
        issueIds.add(ref.issue)
      }
    }

    // Extract issue ids from the commit bodies.
    if (commit.body) {
      const bodyIssueIds = extractIssueIds(commit.body, repo)
      bodyIssueIds.forEach((id) => issueIds.add(id))
    }
  }

  // Fetch issue detail from each issue referenced in the commit message
  // or commit body. Those may include pull request ids that reference
  // other issues.
  const issuesFromCommits = await Promise.all(
    Array.from(issueIds).map(fetchIssue),
  )

  // Extract issue ids from the pull request descriptions.
  for (const issue of issuesFromCommits) {
    // Ignore regular issues as they may not close/fix other issues
    // by reference (at least on GitHub).
    if (!issue.pull_request || !issue.body) {
      continue
    }

    const descriptionIssueIds = extractIssueIds(issue.body, repo)
    descriptionIssueIds.forEach((id) => issueIds.add(id))
  }

  return issueIds
}

export interface IssueOrPullRequest {
  html_url: string
  pull_request: Record<string, string> | null
  body: string | null
}

async function fetchIssue(id: string): Promise<IssueOrPullRequest> {
  const repo = await getInfo()
  const response = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/issues/${id}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
    },
  )
  const resource = (await response.json()) as Promise<IssueOrPullRequest>

  return resource
}
