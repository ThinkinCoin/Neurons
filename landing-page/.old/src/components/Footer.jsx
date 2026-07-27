import React from 'react'
import { Github, Twitter, Mail, ExternalLink } from 'lucide-react'
import './Footer.css'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    protocol: [
      { label: 'Overview', href: '#overview' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Features', href: '#features' },
      { label: 'Tokenomics', href: '#tokenomics' }
    ],
    resources: [
      { label: 'Documentation', href: '#documentation' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Whitepaper', href: '#' },
      { label: 'Smart Contracts', href: '#' }
    ],
    community: [
      { label: 'GitHub', href: '#', icon: Github },
      { label: 'Twitter', href: '#', icon: Twitter },
      { label: 'Contact', href: '#', icon: Mail }
    ]
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-text">NEURONS</span>
              <span className="logo-subtitle">Protocol</span>
            </div>
            <p className="footer-description">
              Revolutionizing education through blockchain technology. 
              Learn, prove, and earn with cryptographic verification.
            </p>
            <div className="social-links">
              {footerLinks.community.map((link, index) => {
                const IconComponent = link.icon
                return (
                  <a 
                    key={index}
                    href={link.href}
                    className="social-link"
                    aria-label={link.label}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <IconComponent size={20} />
                  </a>
                )
              })}
            </div>
          </div>

          <div className="footer-links">
            <div className="link-group">
              <h4 className="link-group-title">Protocol</h4>
              <ul className="link-list">
                {footerLinks.protocol.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="footer-link">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="link-group">
              <h4 className="link-group-title">Resources</h4>
              <ul className="link-list">
                {footerLinks.resources.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="footer-link">
                      {link.label}
                      {link.href === '#' && <ExternalLink size={14} className="external-icon" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-divider"></div>
          <div className="footer-bottom-content">
            <p className="copyright">
              © {currentYear} NEURONS Protocol. All rights reserved.
            </p>
            <div className="footer-bottom-links">
              <a href="#" className="footer-bottom-link">Privacy Policy</a>
              <a href="#" className="footer-bottom-link">Terms of Service</a>
              <a href="#" className="footer-bottom-link">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer