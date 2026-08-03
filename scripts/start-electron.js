#!/usr/bin/env node
'use strict'

/**
 * Launches Electron with a clean environment.
 *
 * Some editors (VS Code in particular) export ELECTRON_RUN_AS_NODE=1 into their
 * integrated terminal. If that leaks through, Electron boots as a plain Node
 * process and `require('electron')` returns no app object at all. Stripping it
 * here means `npm run dev` / `npm start` behave the same everywhere.
 */

const { spawn } = require('child_process')
const path = require('path')

const electron = require('electron')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const args = process.argv.slice(2)
const projectRoot = path.join(__dirname, '..')

const child = spawn(electron, args.length ? args : [projectRoot], {
  stdio: 'inherit',
  env,
})

child.on('close', (code) => process.exit(code ?? 0))
child.on('error', (err) => {
  console.error('Failed to launch Electron:', err.message)
  process.exit(1)
})
