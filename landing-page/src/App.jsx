import React from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Features from './components/Features'
import Tokenomics from './components/Tokenomics'
import FAQ from './components/FAQ'
import Documentation from './components/Documentation'
import Footer from './components/Footer'

function App() {
  return (
    <div className="App">
      <Header />
      <Hero />
      <HowItWorks />
      <Features />
      <Tokenomics />
      <FAQ />
      <Documentation />
      <Footer />
    </div>
  )
}

export default App