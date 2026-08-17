const FEATURES = [
  {
    title: 'Nothing leaves the machine',
    body: 'Prompts, replies and attachments stay local. Chats are plain JSON in your own app-data folder — no account, no telemetry, and the app works with the network off.',
  },
  {
    title: 'Streaming conversation',
    body: 'Token-by-token replies with full markdown: tables, LaTeX and highlighted code with copy buttons. Edit a message to rewind, regenerate an answer, or stop generation mid-stream.',
  },
  {
    title: 'Images and file attachments',
    body: 'Drag, paste or pick images for vision models. Support is read from the model itself, so attaching an image to a text-only model is caught before the request is sent.',
  },
  {
    title: 'Model library',
    body: 'A curated catalog by task and size with RAM guidance and live download progress, plus install-by-name for anything in the Ollama library. Delete models to reclaim disk.',
  },
  {
    title: 'Searchable history',
    body: 'Every conversation saved and auto-titled, grouped by day, pinnable and renameable, with full-text search across all of them and single-file export and import.',
  },
  {
    title: 'Generation controls',
    body: 'Temperature, top-p, top-k, repeat penalty, context window and response length, a system prompt applied everywhere, and how long models stay resident in memory.',
  },
]

export default function Features() {
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Features</p>
          <h2>A complete client, not a wrapper</h2>
          <p>
            Local Graph handles the interface, history and model management. Ollama runs the models on your
            hardware.
          </p>
        </div>

        <div className="features">
          {FEATURES.map(({ title, body }, index) => (
            <article className="feature" key={title}>
              <span className="feature-num">{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
