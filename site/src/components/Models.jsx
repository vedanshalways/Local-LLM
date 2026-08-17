/**
 * Model names come from the app's own catalog (src/lib/catalog.js), which is a
 * starting point rather than a compatibility list — the Models page installs any
 * `name:tag` the server can pull.
 */
const FAMILIES = [
  { name: 'Llama 3.1 · 3.2', publisher: 'Meta', note: 'General · 1B–70B' },
  { name: 'Qwen 3 · 2.5', publisher: 'Alibaba', note: 'General · 0.5B–32B' },
  { name: 'Gemma 3', publisher: 'Google', note: 'General · vision' },
  { name: 'Mistral · Nemo', publisher: 'Mistral AI', note: 'General' },
  { name: 'Phi 4', publisher: 'Microsoft', note: 'General · reasoning' },
  { name: 'DeepSeek R1', publisher: 'DeepSeek', note: 'Reasoning' },
  { name: 'QwQ', publisher: 'Alibaba', note: 'Reasoning' },
  { name: 'Llama 3.2 Vision', publisher: 'Meta', note: 'Vision' },
  { name: 'LLaVA · Moondream', publisher: 'Open source', note: 'Vision · small' },
  { name: 'Qwen 2.5 Coder', publisher: 'Alibaba', note: 'Code' },
  { name: 'Code Llama · CodeGemma', publisher: 'Meta · Google', note: 'Code' },
  { name: 'Nomic · mxbai Embed', publisher: 'Nomic · Mixedbread', note: 'Embeddings' },
]

const POINTS = [
  {
    title: 'Anything the library has, by name',
    body: 'The catalog above is a starting point, not a compatibility list. Add by name pulls any tag — including ones that were never on the list — and it appears in the picker when it finishes.',
    code: 'mixtral:8x7b',
  },
  {
    title: 'The app adapts to the model',
    body: 'Capabilities are read from each model rather than hardcoded, so vision models accept images, reasoning models get a collapsible thought process, and a text-only model refuses an image before the request is sent.',
  },
  {
    title: 'Your own variants',
    body: 'Derive a model from any base with its own system prompt and sampling parameters — a terse code reviewer, a long-context summariser — and it becomes a separate entry in the picker.',
  },
  {
    title: 'Or a machine down the hall',
    body: 'Point the app at a model server elsewhere on your network and the weights stay on that box. Same interface, heavier hardware — still no third party involved.',
    code: 'http://192.168.1.20:11434',
  },
]

export default function Models() {
  return (
    <section className="section" id="models">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Models</p>
          <h2>Works with any local model</h2>
          <p>
            Local Graph is not tied to one model or vendor. Anything your local server can run — any size,
            any family, general, vision, reasoning, code or embeddings — shows up in the picker and swaps
            per conversation.
          </p>
        </div>

        <div className="families">
          {FAMILIES.map(({ name, publisher, note }) => (
            <div className="family" key={name}>
              <span className="family-name">{name}</span>
              <span className="family-pub">{publisher}</span>
              <span className="family-note">{note}</span>
            </div>
          ))}
        </div>

        <div className="points">
          {POINTS.map(({ title, body, code }) => (
            <div className="point" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
              {code && <code className="snippet">{code}</code>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
