import React from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, ExternalLink } from 'lucide-react'
import './Documentation.css'

const Documentation = () => {
  const docs = [
    {
      title: 'Protocol Overview',
      description: 'Complete introduction to NEURONS Protocol, architecture, and core concepts',
      link: '#',
      type: 'overview'
    },
    {
      title: 'NEURONS Token Technical Specification',
      description: 'Detailed ERC-20 token implementation, features, and smart contract documentation',
      link: '#',
      type: 'technical'
    },
    {
      title: 'Proof-of-Knowledge System',
      description: 'Cryptographic verification mechanism using EIP-712 signatures for learning validation',
      link: '#',
      type: 'technical'
    },
    {
      title: 'Learn-to-Win Platform Design',
      description: 'Gamified learning ecosystem with courses, challenges, and reward mechanisms',
      link: '#',
      type: 'platform'
    }
  ]

  const resources = [
    {
      title: 'Smart Contracts',
      description: 'Access the complete smart contract repository',
      icon: <FileText size={24} />,
      link: '#'
    },
    {
      title: 'Whitepaper',
      description: 'Download the comprehensive whitepaper PDF',
      icon: <Download size={24} />,
      link: '#'
    },
    {
      title: 'API Documentation',
      description: 'Developer API reference and integration guides',
      icon: <ExternalLink size={24} />,
      link: '#'
    }
  ]

  return (
    <section id="documentation" className="documentation-section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Documentation
        </motion.h2>

        <div className="documentation-content">
          <div className="docs-grid">
            <div className="docs-section">
              <motion.h3 
                className="docs-subtitle"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                Technical Documentation
              </motion.h3>
              
              <div className="docs-list">
                {docs.map((doc, index) => (
                  <motion.a
                    key={index}
                    href={doc.link}
                    className="doc-card glass"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -5 }}
                  >
                    <div className="doc-content">
                      <h4 className="doc-title">{doc.title}</h4>
                      <p className="doc-description">{doc.description}</p>
                    </div>
                    <div className="doc-arrow">
                      <ExternalLink size={20} />
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>

            <div className="resources-section">
              <motion.h3 
                className="docs-subtitle"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                Developer Resources
              </motion.h3>
              
              <div className="resources-list">
                {resources.map((resource, index) => (
                  <motion.a
                    key={index}
                    href={resource.link}
                    className="resource-card glass"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="resource-icon">{resource.icon}</div>
                    <div className="resource-content">
                      <h4 className="resource-title">{resource.title}</h4>
                      <p className="resource-description">{resource.description}</p>
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Documentation