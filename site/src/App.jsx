import { useState } from 'react'

import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Features from './components/Features.jsx'
import Models from './components/Models.jsx'
import Install from './components/Install.jsx'
import AllDownloads from './components/AllDownloads.jsx'
import Reference from './components/Reference.jsx'
import Footer from './components/Footer.jsx'
import { detectOS } from './config.js'

export default function App() {
  // Detected once, then owned by the page: the platform picked in the install
  // section also drives the hero and nav buttons.
  const [os, setOs] = useState(detectOS)

  return (
    <>
      <Nav os={os} />
      <main>
        <Hero os={os} onSelectOS={setOs} />
        <Features />
        <Models />
        <Install os={os} onSelectOS={setOs} />
        <AllDownloads />
        <Reference />
      </main>
      <Footer />
    </>
  )
}
