import { useMemo, useState } from 'react'

import { normaliseSpec, niceScale, formatTick } from '../lib/plot.js'

/**
 * Renders a ```chart block as SVG. Series colours are assigned in fixed order —
 * never cycled by rank — so a series keeps its colour when others are added.
 * Both palettes are validated for colour-vision separation and contrast against
 * their own surface; the dark steps are chosen, not flipped.
 */
const PALETTE_LIGHT = ['#4f46e5', '#db2777', '#0891b2', '#a16207', '#7c3aed', '#15803d']
const PALETTE_DARK = ['#6366f1', '#ec4899', '#0891b2', '#d97706', '#8b5cf6', '#16a34a']

const WIDTH = 640
const HEIGHT = 320
const PADDING = { top: 26, right: 18, bottom: 42, left: 54 }

export default function Chart({ source }) {
  const [hover, setHover] = useState(null)

  const parsed = useMemo(() => {
    try {
      return { spec: normaliseSpec(JSON.parse(source)) }
    } catch (err) {
      return { error: err.message }
    }
  }, [source])

  // A malformed block falls back to showing the text, never to a broken chart.
  if (parsed.error) {
    return (
      <div className="chart-error">
        <div className="chart-error-title">Couldn't draw this chart — {parsed.error}</div>
        <pre>
          <code>{source}</code>
        </pre>
      </div>
    )
  }

  const { type, title, xLabel, yLabel, series } = parsed.spec
  const dark = document.documentElement.dataset.theme === 'dark'
  const palette = dark ? PALETTE_DARK : PALETTE_LIGHT

  const plotWidth = WIDTH - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom

  const allPoints = series.flatMap((s) => s.points)
  const categorical = type === 'bar' || series.some((s) => s.categorical)

  const xValues = allPoints.map((p) => p.x)
  const yValues = allPoints.map((p) => p.y)
  const xScaleInfo = niceScale(Math.min(...xValues), Math.max(...xValues))
  const yScaleInfo = niceScale(Math.min(0, Math.min(...yValues)), Math.max(...yValues))

  const categories = categorical
    ? [...new Set(series.flatMap((s) => s.points.map((p) => p.label)))]
    : []

  const xOf = (point, index) =>
    categorical
      ? PADDING.left + ((categories.indexOf(point.label) + 0.5) / categories.length) * plotWidth
      : PADDING.left + ((point.x - xScaleInfo.min) / (xScaleInfo.max - xScaleInfo.min || 1)) * plotWidth

  const yOf = (value) =>
    PADDING.top + plotHeight - ((value - yScaleInfo.min) / (yScaleInfo.max - yScaleInfo.min || 1)) * plotHeight

  const zeroY = yOf(0)

  return (
    <figure className="chart">
      {title && <figcaption className="chart-title">{title}</figcaption>}

      {series.length > 1 && (
        <div className="chart-legend">
          {series.map((s, index) => (
            <span key={s.name || index}>
              <i style={{ background: palette[index % palette.length] }} />
              {s.name}
            </span>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="chart-svg"
        role="img"
        aria-label={title || 'chart'}
        onMouseLeave={() => setHover(null)}
      >
        {/* grid + y ticks */}
        {yScaleInfo.ticks.map((tick) => (
          <g key={tick}>
            <line
              className="chart-grid"
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yOf(tick)}
              y2={yOf(tick)}
            />
            <text className="chart-tick" x={PADDING.left - 9} y={yOf(tick) + 4} textAnchor="end">
              {formatTick(tick, yScaleInfo.step)}
            </text>
          </g>
        ))}

        {/* x ticks */}
        {categorical
          ? categories.map((label, index) => (
              <text
                key={label}
                className="chart-tick"
                x={PADDING.left + ((index + 0.5) / categories.length) * plotWidth}
                y={HEIGHT - PADDING.bottom + 20}
                textAnchor="middle"
              >
                {label}
              </text>
            ))
          : xScaleInfo.ticks.map((tick) => (
              <text
                key={tick}
                className="chart-tick"
                x={PADDING.left + ((tick - xScaleInfo.min) / (xScaleInfo.max - xScaleInfo.min || 1)) * plotWidth}
                y={HEIGHT - PADDING.bottom + 20}
                textAnchor="middle"
              >
                {formatTick(tick, xScaleInfo.step)}
              </text>
            ))}

        {/* the zero line reads as an axis when the data crosses it */}
        {yScaleInfo.min < 0 && (
          <line className="chart-axis" x1={PADDING.left} x2={WIDTH - PADDING.right} y1={zeroY} y2={zeroY} />
        )}
        <line
          className="chart-axis"
          x1={PADDING.left}
          x2={PADDING.left}
          y1={PADDING.top}
          y2={HEIGHT - PADDING.bottom}
        />

        {series.map((s, seriesIndex) => {
          const colour = palette[seriesIndex % palette.length]
          const points = s.points

          if (type === 'bar') {
            const slot = plotWidth / (categories.length || 1)
            const barWidth = Math.max(4, (slot / series.length) * 0.7)
            return points.map((point, index) => {
              const centre = xOf(point, index)
              const x = centre - (series.length * barWidth) / 2 + seriesIndex * barWidth
              const top = Math.min(yOf(point.y), zeroY)
              const height = Math.max(1, Math.abs(zeroY - yOf(point.y)))
              return (
                <rect
                  key={`${seriesIndex}-${index}`}
                  x={x}
                  y={top}
                  width={barWidth - 2 /* surface gap between adjacent bars */}
                  height={height}
                  rx="4"
                  fill={colour}
                  onMouseEnter={() => setHover({ x: centre, y: top, point, name: s.name, colour })}
                />
              )
            })
          }

          const path = points
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xOf(point, index)} ${yOf(point.y)}`)
            .join(' ')

          return (
            <g key={seriesIndex}>
              {type === 'area' && (
                <path
                  d={`${path} L ${xOf(points[points.length - 1], points.length - 1)} ${zeroY} L ${xOf(points[0], 0)} ${zeroY} Z`}
                  fill={colour}
                  opacity="0.14"
                />
              )}

              {type !== 'scatter' && <path d={path} fill="none" stroke={colour} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}

              {(type === 'scatter' || points.length <= 24) &&
                points.map((point, index) => (
                  <circle
                    key={index}
                    cx={xOf(point, index)}
                    cy={yOf(point.y)}
                    r={type === 'scatter' ? 4.5 : 3.5}
                    fill={colour}
                    stroke="var(--bg-app)"
                    strokeWidth="2"
                    onMouseEnter={() =>
                      setHover({ x: xOf(point, index), y: yOf(point.y), point, name: s.name, colour })
                    }
                  />
                ))}
            </g>
          )
        })}

        {hover && (
          <g className="chart-hover" pointerEvents="none">
            <line x1={hover.x} x2={hover.x} y1={PADDING.top} y2={HEIGHT - PADDING.bottom} />
            <circle cx={hover.x} cy={hover.y} r="5" fill={hover.colour} stroke="var(--bg-app)" strokeWidth="2" />
          </g>
        )}

        {yLabel && (
          <text className="chart-axis-label" transform={`translate(14 ${PADDING.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle">
            {yLabel}
          </text>
        )}
        {xLabel && (
          <text className="chart-axis-label" x={PADDING.left + plotWidth / 2} y={HEIGHT - 6} textAnchor="middle">
            {xLabel}
          </text>
        )}
      </svg>

      {hover && (
        <div className="chart-tooltip" style={{ left: `${(hover.x / WIDTH) * 100}%` }}>
          {hover.name && <strong>{hover.name}</strong>}
          <span>
            {hover.point.label ?? formatTick(hover.point.x, xScaleInfo.step)} ·{' '}
            {formatTick(hover.point.y, yScaleInfo.step)}
          </span>
        </div>
      )}

      {/* Colour is never the only channel: the numbers stay available as text. */}
      <details className="chart-data">
        <summary>Data</summary>
        <table>
          <thead>
            <tr>
              <th>{xLabel || 'x'}</th>
              {series.map((s, index) => (
                <th key={index}>{s.name || yLabel || 'y'}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(categorical ? categories : series[0].points.map((p) => p.x)).slice(0, 60).map((key, rowIndex) => (
              <tr key={rowIndex}>
                <td>{categorical ? key : formatTick(key, xScaleInfo.step)}</td>
                {series.map((s, index) => {
                  const point = categorical
                    ? s.points.find((p) => p.label === key)
                    : s.points[rowIndex]
                  return <td key={index}>{point ? formatTick(point.y, yScaleInfo.step) : '—'}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
