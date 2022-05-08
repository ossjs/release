<p align="center">
  <img width="100" src="https://github.com/ossjs/release/blob/main/logo.png?raw=true" alt="Release library logo" />
</p>
<h1 align="center">Release</h1>

<p align="center">Minimalistic, opinionated, and predictable release automation tool.</p>

## General idea

Think [Prettier](https://prettier.io/) but for automated releases: minimalistic, opinionated, and, most of all, predictable. This tool combines the usual expectations from a release manager but brings practicality to the table.

Here's the publishing pipeline this tool implements:

1. Analyzes commits since the latest published release.
1. Determines next package version based on [Conventional Commits](https://www.conventionalcommits.org/) specification.
1. Runs the publishing script.
1. Creates release a tag and a release commit in Git.
1. Creates a new release on GitHub.
1. Pushes changes to GitHub.
1. Comments on relevant GitHub issues and pull requests.

While this sounds like what any other release tool would do, the beauty lies in details. Let's take a more detailed look then at what this tool does differently.

### Defaults

**The workflow above is the default (and the only) behavior.**

That's the release process I personally want for all of my libraries, and that's why it's the default behavior for this tool. If you wish for the release automation tool to do something differently or skip certain steps, then this tool is not for you. I want a predictable, consistent release process, and that's largely achieved by the predictable release workflow for all my projects.

### Release commits

**A release tag and a release commit are automatically created.**

```
commit cee5327f0c7fc9048de7a18ef7b5339acd648a98 (tag: v1.2.0)
Author: GitHub Actions <actions@github.com>
Date:   Thu Apr 21 12:00:00 2022 +0100

    chore(release): v1.2.0

```

Release is a part of the project's history so it's crucial to have explicit release marker in Git presented by a release commit and a release tag.

### Respects publishing failures

**If publishing fails, no release commits/tags will be created or pushed to Git.**

Here's an average experience you'd have if your release (read "publishing to NPM") fails with an average release manager in the wild:

1. Process is terminated but the release tags/commits have already been created _and pushed_ to remote.
1. You need to manually revert the release commit.
1. You need to manually delete the release tag from everywhere.
1. You need to manually delete any other side-effects your release has (i.e. GitHub release).

For an automated tooling there's sure a lot of the word "manual" in this scenario. The worst part is that you cannot just "retry" the release—you need to clean up all the artifacts the release manager has left you otherwise it'll treat the release as successful, stating there's nothing new to release.

The bottom line is: failed releases happen. The package registry may be down, your publishing credentials may be wrong, or the entire internet may just decide to take a hiccup. The tooling you use should acknowledge that and support you in those failure cases, not leave you on your own to do manual cleanup chores after the automated solution.

## Opinionated behaviors

- GitHub-only. This tool is designed for projects hosted on GitHub.
- Release tag has the following format: `v${version}` (i.e. `v1.2.3`).
- Release commit has the following format: `chore(release): v${version}`.
- Does not generate or update the `CHANGELOG` file. This tool generates automatic release notes from your commits and creates a new GitHub release with those notes. Use GitHub releases instead of changelogs.

## Install

```sh
npm install <NAME> --save-dev
```

## Configuration

Create a `ossjs.release.config.js` file on the root of your package.

```ts
{
  /**
   * The publishing script to run.
   * @example "npm publish"
   */
  script: string
}
```

## Usage in CI

This tool exposes a CLI which you can use with any continuous integration providers. No need to install actions, configure things, and pray for it to work.

```json
{
  "name": "my-package",
  "scripts": {
    "release": "<NAME> publish"
  }
}
```

### GitHub Actions

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

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          always-auth: true
          registry-url: https://registry.npmjs.org

      # Configure the Git user that'd author release commits.
      - name: Setup Git
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"

      - run: npm ci
      - run: npm test

      - run: npm run release
        with:
          # Set the "GITHUB_TOKEN" environmental variable
          # required by "@ossjs/release" to communicate with GitHub.
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

          # Set the "NODE_AUTH_TOKEN" environmental variable
          # that "actions/setup-node" uses as the "_authToken"
          # in the generated ".npmrc" file to authenticate
          # publishing to NPM registry.
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## API

### `publish`

Publishes a new version of the package.

#### Options

| Option name       | Type      | Description                                                                                                                                                                            |
| ----------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--dry-run`, `-d` | `boolean` | Creates a release in a dry-run mode. **Note:** this still requires a valid `GITHUB_TOKEN` environmental variable, as the dry-run mode will perform read operations on your repository. |

#### Example

```sh
<NAME> publish
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
<NAME> show
```

```sh
# Display info about a specific release.
<NAME> show v0.19.2
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
| Support dry run                           | ✅      | ✅                                                                                           | ✅                                                                       | [❌](https://github.com/changesets/changesets/issues/614)                               |

> <sup>1</sup> - requires additional plugins.
