/**
 * Parsing and sampling for ```chart blocks.
 *
 * Expressions are parsed into a tiny AST and evaluated by walking it — never
 * with eval or new Function, because the text comes from a model and would
 * otherwise be arbitrary code running in the renderer.
 */

const FUNCTIONS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  ln: Math.log, log: Math.log10, log2: Math.log2, log10: Math.log10,
  exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round,
  sign: Math.sign, min: Math.min, max: Math.max,
}

const CONSTANTS = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 }

function tokenize(input) {
  const tokens = []
  let i = 0

  while (i < input.length) {
    const char = input[i]

    if (/\s/.test(char)) { i++; continue }

    if (/[0-9.]/.test(char)) {
      let number = ''
      while (i < input.length && /[0-9.]/.test(input[i])) number += input[i++]
      tokens.push({ type: 'number', value: Number(number) })
      continue
    }

    if (/[a-zA-Z_]/.test(char)) {
      let name = ''
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) name += input[i++]
      tokens.push({ type: 'name', value: name.toLowerCase() })
      continue
    }

    if ('+-*/^(),%'.includes(char)) {
      tokens.push({ type: 'op', value: char })
      i++
      continue
    }

    throw new Error(`unexpected character "${char}"`)
  }

  return tokens
}

/** Precedence-climbing parser: expression -> AST. */
function parse(tokens) {
  let position = 0
  const peek = () => tokens[position]
  const eat = (value) => {
    const token = tokens[position]
    if (!token || (value && token.value !== value)) {
      throw new Error(`expected "${value}"`)
    }
    position++
    return token
  }

  const parsePrimary = () => {
    const token = peek()
    if (!token) throw new Error('unexpected end of expression')

    if (token.type === 'number') {
      position++
      return { kind: 'number', value: token.value }
    }

    if (token.type === 'op' && (token.value === '-' || token.value === '+')) {
      position++
      const operand = parseUnary()
      return token.value === '-' ? { kind: 'negate', operand } : operand
    }

    if (token.type === 'op' && token.value === '(') {
      position++
      const inner = parseExpression(0)
      eat(')')
      return inner
    }

    if (token.type === 'name') {
      position++
      if (peek()?.value === '(') {
        position++
        const args = []
        if (peek()?.value !== ')') {
          args.push(parseExpression(0))
          while (peek()?.value === ',') {
            position++
            args.push(parseExpression(0))
          }
        }
        eat(')')
        if (!FUNCTIONS[token.value]) throw new Error(`unknown function "${token.value}"`)
        return { kind: 'call', name: token.value, args }
      }
      return { kind: 'variable', name: token.value }
    }

    throw new Error(`unexpected token "${token.value}"`)
  }

  const parseUnary = () => parsePrimary()

  const BINARY = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 }

  function parseExpression(minPrecedence) {
    let left = parseUnary()

    while (peek()?.type === 'op' && BINARY[peek().value] >= minPrecedence && BINARY[peek().value]) {
      const operator = eat().value
      // ^ is right-associative; the rest bind left to right.
      const next = operator === '^' ? BINARY[operator] : BINARY[operator] + 1
      const right = parseExpression(next)
      left = { kind: 'binary', operator, left, right }
    }

    return left
  }

  const ast = parseExpression(0)
  if (position < tokens.length) throw new Error(`unexpected "${tokens[position].value}"`)
  return ast
}

function evaluate(node, x) {
  switch (node.kind) {
    case 'number':
      return node.value
    case 'variable':
      if (node.name === 'x') return x
      if (node.name in CONSTANTS) return CONSTANTS[node.name]
      throw new Error(`unknown name "${node.name}"`)
    case 'negate':
      return -evaluate(node.operand, x)
    case 'call':
      return FUNCTIONS[node.name](...node.args.map((arg) => evaluate(arg, x)))
    case 'binary': {
      const a = evaluate(node.left, x)
      const b = evaluate(node.right, x)
      switch (node.operator) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/': return a / b
        case '%': return a % b
        case '^': return a ** b
        default: throw new Error(`unknown operator "${node.operator}"`)
      }
    }
    default:
      throw new Error('bad expression')
  }
}

/** Compile "2*x + 5" into a function of x. Throws if the text isn't an expression. */
export function compileExpression(source) {
  const cleaned = String(source)
    .replace(/^\s*y\s*=/i, '')          // models like writing "y = 2x + 5"
    .replace(/(\d)\s*([a-zA-Z(])/g, '$1*$2') // implicit multiplication: 2x -> 2*x
    .trim()
  const ast = parse(tokenize(cleaned))
  return (x) => evaluate(ast, x)
}

/** Sample a function across a domain, dropping anything undefined (e.g. log of a negative). */
export function sampleFunction(fn, [from, to], steps = 160) {
  const points = []
  const span = to - from
  for (let i = 0; i <= steps; i++) {
    const x = from + (span * i) / steps
    let y
    try {
      y = fn(x)
    } catch {
      continue
    }
    if (Number.isFinite(y)) points.push({ x, y })
  }
  return points
}

/** "Nice" axis bounds and a tick step, so the axis lands on readable numbers. */
export function niceScale(min, max, targetTicks = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, step: 0.5, ticks: [0, 0.5, 1] }
  if (min === max) {
    const pad = Math.abs(min) || 1
    min -= pad / 2
    max += pad / 2
  }

  const rawStep = (max - min) / targetTicks
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalised = rawStep / magnitude
  const step = (normalised >= 5 ? 5 : normalised >= 2 ? 2 : 1) * magnitude

  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step

  const ticks = []
  // Accumulate with an epsilon so floating point doesn't drop the final tick.
  for (let value = niceMin; value <= niceMax + step * 1e-6; value += step) {
    ticks.push(Math.abs(value) < step * 1e-6 ? 0 : value)
  }

  return { min: niceMin, max: niceMax, step, ticks }
}

export function formatTick(value, step) {
  if (!Number.isFinite(value)) return ''
  const decimals = Math.max(0, Math.min(6, -Math.floor(Math.log10(Math.abs(step || 1)))))
  const rounded = Number(value.toFixed(decimals))
  return Math.abs(rounded) >= 10000 ? rounded.toExponential(1) : String(rounded)
}

/**
 * Normalise a ```chart block into series the renderer can draw. Accepts either
 * explicit data or a function of x, and tolerates the shapes a model is likely
 * to produce.
 */
export function normaliseSpec(spec) {
  if (!spec || typeof spec !== 'object') throw new Error('the chart block is not an object')

  const type = ['line', 'bar', 'scatter', 'area'].includes(spec.type) ? spec.type : 'line'
  const title = typeof spec.title === 'string' ? spec.title : ''
  const xLabel = spec.xLabel || spec.x_label || spec.xlabel || ''
  const yLabel = spec.yLabel || spec.y_label || spec.ylabel || ''

  const rawSeries = Array.isArray(spec.series)
    ? spec.series
    : [{ name: spec.name || spec.label || '', data: spec.data, fn: spec.fn ?? spec.function ?? spec.equation }]

  const domain = Array.isArray(spec.domain) && spec.domain.length === 2 ? spec.domain.map(Number) : [-10, 10]

  const series = rawSeries.map((entry, index) => {
    const name = entry.name || entry.label || (rawSeries.length > 1 ? `Series ${index + 1}` : '')
    const expression = entry.fn ?? entry.function ?? entry.equation

    if (expression) {
      const compiled = compileExpression(expression)
      return { name: name || String(expression), points: sampleFunction(compiled, domain), smooth: true }
    }

    const data = entry.data || entry.points || entry.values
    if (!Array.isArray(data) || !data.length) throw new Error(`series "${name || index}" has no data`)

    const points = data.map((point, i) => {
      if (Array.isArray(point)) return { x: Number(point[0]), y: Number(point[1]), label: String(point[0]) }
      if (typeof point === 'number') return { x: i, y: point, label: String(spec.labels?.[i] ?? i) }
      const x = point.x ?? point.label ?? point.name ?? i
      return {
        x: typeof x === 'number' ? x : i,
        y: Number(point.y ?? point.value ?? 0),
        label: String(point.label ?? point.name ?? x),
      }
    })

    return { name, points, categorical: points.some((p) => p.label !== String(p.x)) }
  })

  if (!series.length) throw new Error('no series to draw')
  return { type, title, xLabel, yLabel, series }
}
