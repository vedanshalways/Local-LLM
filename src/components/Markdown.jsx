import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'

import { CopyButton } from './ui.jsx'

/** Pull the raw text out of a rehype code node so the copy button gets it verbatim. */
function nodeText(node) {
  if (!node) return ''
  if (node.type === 'text') return node.value || ''
  if (Array.isArray(node.children)) return node.children.map(nodeText).join('')
  return ''
}

const components = {
  code({ node, inline, className, children, ...props }) {
    // Inline spans render as-is; only fenced blocks get the chrome.
    const isBlock = !inline && /language-/.test(className || '')
    if (!isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }

    const language = (className || '').replace('hljs ', '').replace('language-', '').trim() || 'text'
    const raw = nodeText(node)

    return (
      <div className="code-block">
        <div className="code-header">
          <span>{language}</span>
          <CopyButton text={raw} className="code-copy" showLabel label="Copy code" size={13} />
        </div>
        <pre>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    )
  },

  // react-markdown hands `pre` the already-wrapped block, so pass it straight through.
  pre({ children }) {
    return <>{children}</>
  },

  table({ children }) {
    return (
      <div className="md-table-wrap">
        <table>{children}</table>
      </div>
    )
  },

  a({ href, children, ...props }) {
    const open = (event) => {
      event.preventDefault()
      if (href && /^https?:\/\//.test(href)) window.api.app.openExternal(href)
    }
    return (
      <a href={href} onClick={open} {...props}>
        {children}
      </a>
    )
  },

  img({ src, alt }) {
    // Only render inline images that are already local (data URIs); remote ones stay as text.
    if (src && src.startsWith('data:')) return <img src={src} alt={alt || ''} />
    return <span className="muted">[image: {alt || src}]</span>
  },
}

const remarkPlugins = [remarkGfm, remarkMath]
const rehypePlugins = [rehypeKatex, [rehypeHighlight, { detect: true, ignoreMissing: true }]]

function MarkdownInner({ children }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}

export const Markdown = memo(MarkdownInner)
export default Markdown
