<p align="center">
  <img width="100" src="https://github.com/ossjs/release/blob/main/logo.png?raw=true" alt="Release logo" />
</p>
<h1 align="center">Release</h1>

<p align="center">Minimalistic, opinionated, and predictable release automation tool.</p>

## Motivation

I created Release because I wanted an easy and reliable way to publish my libraries. Over the years, I've tried every release automation tool out there and found a bunch of issues, ideological mismatches, and lacking developer experience in every one of them. I've grown so tired solving release bugs that I decided it would be more productive to create my own tool and, turns out, it was! I've been using Release for my projects ever since and never looked back. It does exactly what I want, the way I want it.

You can keep reading to learn more about what Release does differently, jump to the [Getting started](#getting-started) section, or read how it [compares to the alternatives](#comparison).

## Release flow

Release performs the following release flow:

1. Analyze commits since the last published release (tag);
1. Determine the next package version per [Conventional Commits](https://www.conventionalcommits.org/);
1. Lint your package via `publint` to prevent publishing broken packages;
1. Run your publishing script (e.g. `npm publish`);
1. Create a release tag and a release commit in Git;
1. Create a new release with release notes on GitHub;
1. Push the changes;
1. Comment on relevant GitHub issues and pull request.

## Opinions

Release is an _opinionated_ tool, which means it intentionally implements certain behaviors that I personally like without the ability to modify them. Let's talk about some of those behaviors.

### Release first, tag later

Unlike other automation tools, Release makes sure to create a release commit, tag it with the appropriate tag, and push those changes to Git **only after** your release pipeline succeeded. This keeps your Git history clean and makes recovering from failed releases much easier.

### Quality check

Release requires your package to pass the [`publint`](https://publint.dev/) check before proceeding with the publishing. This ensures that you are publshing a valid package that won't break your consumers. If you've ever misconfigured an `exports` condition, you know how neat this is.

### GitHub-only

Release is written to work with projects hosted on GitHub because that is where I release my software. It relies on GitHub repository URL schemes, creates GitHub releases, crawls issue and pull request references.

### Release commit

Release creates release commits in the `chore(release): v${NEXT_VERSION}` format. They will look like this in your Git history:

```
commit cee5327f0c7fc9048de7a18ef7b5339acd648a98 (tag: v1.2.0)
Author: GitHub Actions <actions@github.com>
Date:   Thu Apr 21 12:00:00 2022 +0100

    chore(release): v1.2.0
```

## Getting started

### Install

```sh
npm i @ossjs/release -D
```

### Create configuration

Create a `release.config.json` file at the root of your project. Open the newly created file and create a new release profile:

```js
// release.config.json
{
  "$schema": "./node_modules/@ossjs/release/schema.json",
  "profiles": [
    {
      "name": "latest",
      "use": "npm publish"
    }
  ]
}
```

### Generate GitHub Personal Access Token

Generate a [Personal Access Token](https://github.com/settings/tokens/new?scopes=repo,admin:repo_hook,admin:org_hook) for your GitHub user with the following permissions:

- `repo`
- `admin:repo_hook`
- `admin:org_hook`

Expose the generated access token in the `GITHUB_TOKEN` environmental variable in your local and/or CI environment. This tool uses the `GITHUB_TOKEN` variable to communicate with GitHub on your behalf: read and write releases, post comments on relevant issues, etc.

### Create a release

Commit and push your changes following the [Conventional Commit](https://www.conventionalcommits.org/) message structure. Once done, run the following command to generate the next release automatically:

```sh
release publish
```

Congratulations! :tada: You've successfully published your first release!

## Configuration

This tool expects a configuration file at `release.config.json`. The configuration file must export an object of the following shape:

```ts
{
  profiles: Array<{
    /**
     * Profile name.
     * @default "latest"
     */
    name: string

    /**
     * The publishing script to run.
     * @example "npm publish"
     * @example "pnpm publish --no-git-checks"
     */
    use: string

    /**
     * Treat major version bumps as minor.
     * This prevents publishing a package that is in a
     * pre-release phase (< 1.0).
     */
    prerelease?: boolean
  }>
  use: string
}
```

## API

### `publish`

Publishes a new version of the package.

#### Options

| Option name       | Type                           | Description                                                                                                                                                                            |
| ----------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--profile`, `-p` | `string` (Default: `"latest"`) | Release profile name from `release.config.json`.                                                                                                                                       |
| `--dry-run`, `-d` | `boolean`                      | Creates a release in a dry-run mode. **Note:** this still requires a valid `GITHUB_TOKEN` environmental variable, as the dry-run mode will perform read operations on your repository. |

#### Example

Running this command will publish the package according to the `latest` defined profile:

```sh
release publish
```

Providing an explicit `--profile` option allows to publish the package accordig to another profile from `release.config.json`:

```sh
release publish --profile nightly
```

### `notes`

Generates release notes and creates a new GitHub release for the given release tag.

This command is designed to recover from a partially failed release process, as well as to generate changelogs for old releases.

- This command requires an existing (merged) release tag;
- This command accepts past release tags;
- This command has no effect if a GitHub release for the given tag already exists.

#### Arguments

| Argument name | Type     | Description              |
| ------------- | -------- | ------------------------ |
| `tag`         | `string` | Tag name of the release. |

#### Example

```sh
# Generate release notes and create a GitHub release
# for the release tag "v1.0.3".
release notes v1.0.3
```

### `show`

Displays information about a particular release.

Release information includes the following:

- Commit associated with the release tag;
- Release status (public/draft/unpublished);
- GitHub release URL if present.

#### Arguments

| Argument name | Type     | Description                                   |
| ------------- | -------- | --------------------------------------------- |
| `tag`         | `string` | (_Optional_) Tag name of the release to show. |

#### Example

```sh
# Display info about the latest release.
release show
```

```sh
# Display info about a specific release.
release show v0.19.2
```

## Recipes

This tool exposes a CLI which you can use with any continuous integration providers. No need to install actions, configure things, and pray for it to work.

```js
{
  "name": "my-package",
  "scripts": {
    "release": "release publish"
  }
}
```

### GitHub Actions

Before you proceed, make sure you've [generated GitHub Personal Access Token](#generate-github-personal-access-token). Create a [new repository/organization secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets) called `CI_GITHUB_TOKEN` and use your Personal Access Token as the value for that secret.

You will be using `secrets.CI_GITHUB_TOKEN` instead of the default `secrets.GITHUB_TOKEN` in the workflow file in order to have correct GitHub permissions during publishing. For example, your Personal Access Token will allow for Release to push release commits/tags to protected branches, while the default `secrets.GITHUB_TOKEN` will not.

```yml
# .github/workflows/release.yml
name: release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          # Fetch the entire commit history to include all commits.
          # By default, "actions/checkout" checks out the repository
          # at the commit that's triggered the workflow. This means
          # that the "@ossjs/release" may not be able to read older
          # commits that may affect the next release version number.
          fetch-depth: 0

          # Provide your custom "CI_GITHUB_TOKEN" secret that holds
          # your GitHub Personal Access Token.
          token: ${{ secrets.CI_GITHUB_TOKEN }}

      - uses: actions/setup-node@v3
        with:
          always-auth: true
          registry-url: https://registry.npmjs.org

      # Configure the Git user that'd author release commits.
      - name: Setup Git
        run: |
          git config --local user.name "GitHub Actions"
          git config --local user.email "actions@github.com"

      - run: npm ci
      - run: npm test

      - run: npm run release
        env:
          # Set the "GITHUB_TOKEN" environmental variable
          # required by "@ossjs/release" to communicate with GitHub.
          GITHUB_TOKEN: ${{ secrets.CI_GITHUB_TOKEN }}

          # Set the "NODE_AUTH_TOKEN" environmental variable
          # that "actions/setup-node" uses as the "_authToken"
          # in the generated ".npmrc" file to authenticate
          # publishing to NPM registry.
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Create the configuration file and specify the release script:

```js
// release.config.json
{
  "profiles": [
    {
      "name": "latest",
      // Note that NPM doesn't need the next release version.
      // It will read the incremented version from "package.json".
      "use": "npm publish"
    }
  ]
}
```

> If publishing a scoped package, use the `npm publish --access public` script instead.

### Usage with Yarn

Running `yarn publish` will prompt you for the next release version. Use the `--new-version` option and provide it with the `RELEASE_VERSION` environmental variable injected by Release that indicates the next release version based on your commit history.

```js
// release.config.json
{
  "$schema": "./node_modules/@ossjs/release/schema.json",
  "profiles": [
    {
      "name": "latest",
      "use": "yarn publish --new-version $RELEASE_VERSION"
    }
  ]
}
```

Yarn also doesn't seem to respect the `NODE_AUTH_TOKEN` environment variable. Please use the `NPM_AUTH_TOKEN` variable instead:

```yaml
- run: yarn release
  env:
    GITHUB_TOKEN: ${{ secrets.CI_GITHUB_TOKEN }}

    # Use the "NPM_AUTH_TOKEN" instead of "NODE_AUTH_TOKEN".
    NPM_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Usage with PNPM

```js
// release.config.json
{
  "$schema": "./node_modules/@ossjs/release/schema.json",
  "profiles": [
    {
      "name": "latest",
      // Prevent PNPM from checking for a clean Git state
      // to ignore the intermediate release state of the repository.
      "use": "pnpm publish --no-git-checks"
    }
  ]
}
```

### Releasing multiple tags

Leverage GitHub Actions and multiple Release configurations to release different tags from different Git branches.

```js
// release.config.json
{
  "$schema": "./node_modules/@ossjs/release/schema.json",
  "profiles": [
    {
      "name": "latest",
      "use": "npm publish"
    },
    {
      "name": "nightly",
      "use": "npm publish --tag nightly"
    }
  ]
}
```

```yml
name: release

on:
  push:
    # Set multiple branches to trigger this workflow.
    branches: [main, dev]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      # Release to the default ("latest") tag on "main".
      - name: Release latest
        if: github.ref == "refs/heads/main"
        run: npx release publish

      # Release to the "nightly" tag on "dev'.
      - name: Release nightly
        if: github.ref == "refs/heads/dev"
        run: npx release publish -p nightly
```

## Comparison

Below you see how Release compares to other tools. Keep in mind that I'm only comparing how those tools work _by default_ because that's the only thing I care about. Unlike Release, other tools here can satisfy different use-cases through configuration, which is both a blessing and a curse.

|                                           | Release | Semantic Release                                                                             | Auto                                                                     | Changesets                                                                              |
| ----------------------------------------- | ------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| First-class citizen                       | CLI     | Commit                                                                                       | Pull request (labels)                                                    | Changeset                                                                               |
| Derives next version from commits         | ✅      | ✅                                                                                           | ✅                                                                       | ❌                                                                                      |
| Creates a GitHub release                  | ✅      | [✅](https://github.com/semantic-release/semantic-release/releases/tag/v19.0.2)              | [✅](https://github.com/intuit/auto/releases/tag/v10.36.5)               | [✅](https://github.com/changesets/changesets/releases/tag/%40changesets%2Fgit%401.3.2) |
| Creates a release commit in Git           | ✅      | ❌ <sup>1</sup>                                                                              | ✅                                                                       | ✅                                                                                      |
| Comments on relevant GitHub issues        | ✅      | ✅                                                                                           | [✅](https://github.com/intuit/auto/issues/1651#issuecomment-1073389235) | ❌                                                                                      |
| Comments on relevant GitHub pull requests | ✅      | [✅](https://github.com/semantic-release/semantic-release/pull/2330#issuecomment-1015001540) | [✅](https://github.com/intuit/auto/pull/2175#issuecomment-1073389222)   | ?                                                                                       |
| Reverts tags/commits if publishing fails  | ✅      | ❌                                                                                           | ?                                                                        | ?                                                                                       |
| Supports monorepos                        | ❌      | ✅                                                                                           | ✅                                                                       | ✅                                                                                      |
| Supports dry run                          | ✅      | ✅                                                                                           | ✅                                                                       | [❌](https://github.com/changesets/changesets/issues/614)                               |

> <sup>1</sup> - requires additional plugins.
