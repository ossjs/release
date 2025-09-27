import { invariant } from 'outvariant'
import { publint } from 'publint'
import { formatMessage } from 'publint/utils'
import { log } from '#/src/logger.js'
import { execAsync } from './exec-async.js'

export async function lintPackage(): Promise<void> {
  const pkgDir = execAsync.contextOptions.cwd?.toString() || process.cwd()
  const { messages, pkg } = await publint({
    pkgDir,
  })

  let isValid = true

  for (const message of messages) {
    const logLevel = message.type === 'error' ? 'error' : 'warn'
    log[logLevel](formatMessage(message, pkg))

    if (message.type === 'error' || message.type === 'warning') {
      isValid = false
    }
  }

  invariant(
    isValid,
    'Failed to lint the package at "%s": the package contains issues that can potentially produce a broken release. Please resolve the issues above and retry the release.',
    pkgDir,
  )
}
