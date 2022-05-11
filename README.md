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

## Limitations

- This tool does not support `!` (exclamation mark) as a commit message modifier indicating breaking changes. Please always include the `BREAKING CHANGE` indicator in the commit's body if you wish to indicate a breaking change.

## Getting started

### Install

```sh
npm install @ossjs/release --save-dev
```

### Create configuration

Create a configuration file at the root of your repository:

```sh
touch ossjs.release.config.js
```

Open the newly created file and specify the `script` command that publishes your package:

```js
// ossjs.release.config.js
module.exports = {
  script: 'npm publish',
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

This tool expects a configuration file at `ossjs.release.config.js`. The configuration file must export an object of the following shape:

```ts
{
  /**
   * The publishing script to run.
   * @example "npm publish"
   */
  script: string
}
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
release publish
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

```json
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
        with:
          # Set the "GITHUB_TOKEN" environmental variable
          # required by "@ossjs/release" to communicate with GitHub.
          GITHUB_TOKEN: ${{ secrets.CI_GITHUB_TOKEN }}

          # Set the "NODE_AUTH_TOKEN" environmental variable
          # that "actions/setup-node" uses as the "_authToken"
          # in the generated ".npmrc" file to authenticate
          # publishing to NPM registry.
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Usage with Yarn

Running `yarn publish` will prompt you for the next release version. Use the `--new-version` option and provide it with the `RELEASE_VERSION` environmental variable injected by Release that indicates the next release version based on your commit history.

```js
// ossjs.release.config.js
module.exports = {
  script: 'yarn publish --new-version $RELEASE_VERSION',
}
```

Yarn also doesn't seem to respect the `NODE_AUTH_TOKEN` environment variable. Please use the `NPM_AUTH_TOKEN` variable instead:

```yaml
- run: npm run release
  with:
    GITHUB_TOKEN: ${{ secrets.CI_GITHUB_TOKEN }}

    # Use the "NPM_AUTH_TOKEN" instead of "NODE_AUTH_TOKEN".
    NPM_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
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
