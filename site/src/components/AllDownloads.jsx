import { DOWNLOADS, OS_LABELS, RELEASES, VERSION } from '../config.js'
import { Download } from './icons.jsx'

export default function AllDownloads() {
  return (
    <section className="section" id="downloads">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Downloads</p>
          <h2>Version {VERSION}</h2>
          <p>
            Installers are built on GitHub Actions, one runner per platform. Model weights are not bundled.
          </p>
        </div>

        <div className="table">
          <div className="tr head">
            <span>Platform</span>
            <span>Build</span>
            <span>File</span>
            <span />
          </div>

          {Object.entries(DOWNLOADS).map(([os, builds]) =>
            builds.map((build) => (
              <a className="tr" key={build.id} href={build.url}>
                <span className="td-platform">{OS_LABELS[os]}</span>
                <span className="td-build">{build.label}</span>
                <span className="td-file">{build.file}</span>
                <Download size={17} />
              </a>
            )),
          )}
        </div>

        <p className="table-note">
          Older versions and checksums are on the{' '}
          <a href={RELEASES} target="_blank" rel="noreferrer">
            releases page
          </a>
          .
        </p>
      </div>
    </section>
  )
}
