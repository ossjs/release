<h1 align="center">Release</h1>

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

- GitHub-only. This tool is primarily designed GitHub.
- Release tag in in the format `v${version}` (i.e. `v1.2.3`).
- Release commit is `chore(release) v${version}`.
- No `CHANGELOG` updates. This tool generates automatic release notes from your commits and creates a new GitHub release with them. Use GitHub releases instead of changelogs.

## Install

```sh
npm install <NAME> --save-dev
```

## Configuration

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
      - run: npm ci
      - run: npm test
      - run: npm run release
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

> The goal is to run the `npm run release` script with the `GITHUB_TOKEN` environmental variable provided automatically by GitHub.

## API

### `publish`

Publishes a new version of the package.

#### Example

```sh
<NAME> publish
```

### `show`

Displays information about a release.

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
