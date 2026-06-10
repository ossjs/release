import { http, HttpResponse } from 'msw'
import { api } from '#/test/env.js'
import {
  getGitHubTokenType,
  validateAccessToken,
  validateFineGrainedAccessToken,
  GITHUB_NEW_FINE_GRAINED_TOKEN_URL,
} from '#/src/utils/github/validate-access-token.js'

const repo = {
  owner: 'octocat',
  name: 'example',
}

describe(getGitHubTokenType, () => {
  it('returns "fine-grained" for tokens with the "github_pat_" prefix', () => {
    expect(getGitHubTokenType('github_pat_11ABC')).toBe('fine-grained')
  })

  it('returns "classic" for tokens with the "ghp_" prefix', () => {
    expect(getGitHubTokenType('ghp_ABC')).toBe('classic')
  })

  it('returns "classic" for legacy 40-character tokens', () => {
    expect(getGitHubTokenType('a'.repeat(40))).toBe('classic')
  })
})

describe(validateFineGrainedAccessToken, () => {
  it('resolves given a token with sufficient permissions', async () => {
    api.use(
      http.get('https://api.github.com/repos/octocat/example', () => {
        return HttpResponse.json({})
      }),
      http.post('https://api.github.com/repos/octocat/example/releases', () => {
        return new HttpResponse(null, { status: 422 })
      }),
      http.post(
        'https://api.github.com/repos/octocat/example/issues/0/comments',
        () => {
          return new HttpResponse(null, { status: 404 })
        },
      ),
    )

    await expect(
      validateFineGrainedAccessToken('github_pat_TOKEN', repo),
    ).resolves.toBeUndefined()
  })

  it('throws an error given a token that cannot access the repository', async () => {
    api.use(
      http.get('https://api.github.com/repos/octocat/example', () => {
        return new HttpResponse(null, { status: 404 })
      }),
    )

    await expect(
      validateFineGrainedAccessToken('github_pat_TOKEN', repo),
    ).rejects.toThrow(
      `Failed to verify GitHub token permissions: the provided fine-grained "GITHUB_TOKEN" cannot access the "octocat/example" repository. Please make sure that the repository access of the token includes that repository and try again.`,
    )
  })

  it('throws an error given a generic error response from the API', async () => {
    api.use(
      http.get('https://api.github.com/repos/octocat/example', () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )

    await expect(
      validateFineGrainedAccessToken('github_pat_TOKEN', repo),
    ).rejects.toThrow(
      `Failed to verify GitHub token permissions: GitHub API responded with 500 Internal Server Error. Please double-check your "GITHUB_TOKEN" environmental variable and try again.`,
    )
  })

  it('throws an error given a token without the "contents: write" permission', async () => {
    api.use(
      http.get('https://api.github.com/repos/octocat/example', () => {
        return HttpResponse.json({})
      }),
      http.post('https://api.github.com/repos/octocat/example/releases', () => {
        return new HttpResponse(null, { status: 403 })
      }),
      http.post(
        'https://api.github.com/repos/octocat/example/issues/0/comments',
        () => {
          return new HttpResponse(null, { status: 404 })
        },
      ),
    )

    await expect(
      validateFineGrainedAccessToken('github_pat_TOKEN', repo),
    ).rejects.toThrow(
      `Provided "GITHUB_TOKEN" environment variable has insufficient permissions: missing permissions "contents: write". Please generate a new GitHub fine-grained personal access token from this URL: ${GITHUB_NEW_FINE_GRAINED_TOKEN_URL}`,
    )
  })

  it('throws an error given a token without the "issues: write" permission', async () => {
    api.use(
      http.get('https://api.github.com/repos/octocat/example', () => {
        return HttpResponse.json({})
      }),
      http.post('https://api.github.com/repos/octocat/example/releases', () => {
        return new HttpResponse(null, { status: 422 })
      }),
      http.post(
        'https://api.github.com/repos/octocat/example/issues/0/comments',
        () => {
          return new HttpResponse(null, { status: 403 })
        },
      ),
    )

    await expect(
      validateFineGrainedAccessToken('github_pat_TOKEN', repo),
    ).rejects.toThrow(
      `Provided "GITHUB_TOKEN" environment variable has insufficient permissions: missing permissions "issues: write". Please generate a new GitHub fine-grained personal access token from this URL: ${GITHUB_NEW_FINE_GRAINED_TOKEN_URL}`,
    )
  })

  it('throws an error given a token with missing multiple permissions', async () => {
    api.use(
      http.get('https://api.github.com/repos/octocat/example', () => {
        return HttpResponse.json({})
      }),
      http.post('https://api.github.com/repos/octocat/example/releases', () => {
        return new HttpResponse(null, { status: 403 })
      }),
      http.post(
        'https://api.github.com/repos/octocat/example/issues/0/comments',
        () => {
          return new HttpResponse(null, { status: 403 })
        },
      ),
    )

    await expect(
      validateFineGrainedAccessToken('github_pat_TOKEN', repo),
    ).rejects.toThrow(
      `Provided "GITHUB_TOKEN" environment variable has insufficient permissions: missing permissions "contents: write", "issues: write". Please generate a new GitHub fine-grained personal access token from this URL: ${GITHUB_NEW_FINE_GRAINED_TOKEN_URL}`,
    )
  })
})

describe(validateAccessToken, () => {
  it('validates fine-grained tokens against the repository from Git info', async () => {
    api.use(
      http.get('https://api.github.com/repos/:owner/:name', () => {
        return HttpResponse.json({})
      }),
      http.post('https://api.github.com/repos/:owner/:name/releases', () => {
        return new HttpResponse(null, { status: 422 })
      }),
      http.post(
        'https://api.github.com/repos/:owner/:name/issues/0/comments',
        () => {
          return new HttpResponse(null, { status: 404 })
        },
      ),
    )

    await expect(
      validateAccessToken('github_pat_TOKEN'),
    ).resolves.toBeUndefined()
  })
})
