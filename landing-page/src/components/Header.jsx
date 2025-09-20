import React, { useState, useEffect } from 'react'
import { Menu, X, Brain } from 'lucide-react'
import './Header.css'
import "./logo.png"

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const logo = require("./logo.png");


  const handleNavClick = (e, targetId) => {
    e.preventDefault()
    const target = document.querySelector(targetId)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
      closeMenu()
    }
  }

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <nav className="container nav">
        <a href="#" className="logo">
          <logo size={32} />
          <span>Neurons Protocol</span>
        </a>
        
        <button 
          className="mobile-menu-toggle"
          onClick={toggleMenu}
          aria-label="Toggle mobile menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <li>
            <a href="#how-it-works" onClick={(e) => handleNavClick(e, '#how-it-works')}>
              How it Works
            </a>
          </li>
          <li>
            <a href="#features" onClick={(e) => handleNavClick(e, '#features')}>
              Features
            </a>
          </li>
          <li>
            <a href="#tokenomics" onClick={(e) => handleNavClick(e, '#tokenomics')}>
              Tokenomics
            </a>
          </li>
          <li>
            <a href="#faq" onClick={(e) => handleNavClick(e, '#faq')}>
              FAQ
            </a>
          </li>
          <li>
            <a href="#docs" onClick={(e) => handleNavClick(e, '#docs')}>
              Docs
            </a>
          </li>
        </ul>
      </nav>
    </header>
  )
}

export default Header