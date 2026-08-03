'use strict'

/**
 * Apple Silicon refuses to launch a completely unsigned binary. When no signing
 * certificate is configured (the normal case for a free/self-distributed build),
 * apply an ad-hoc signature so the app still runs after the user clears
 * quarantine. A real Developer ID, if present, is applied by electron-builder
 * afterwards and supersedes this.
 */

const { execFileSync } = require('child_process')
const path = require('path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const hasIdentity = Boolean(process.env.CSC_LINK || process.env.CSC_NAME)
  if (hasIdentity) return

  const appName = `${context.packager.appInfo.productFilename}.app`
  const appPath = path.join(context.appOutDir, appName)

  try {
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'pipe' })
    console.log(`  • ad-hoc signed ${appName} (${context.arch === 1 ? 'x64' : 'arm64'})`)
  } catch (err) {
    console.warn(`  • could not ad-hoc sign ${appName}: ${err.message}`)
  }
}
