import React from 'react'
import { motion } from 'framer-motion'
import { Coins, Shield, Target, Zap, Lock, Users } from 'lucide-react'
import './Features.css'

const Features = () => {
  const features = [
    {
      icon: <Coins size={48} />,
      title: 'NEURONS Token',
      description: 'ERC-20 token with 10M fixed supply, pausability, permit support, and role-based minting/burning controls'
    },
    {
      icon: <Shield size={48} />,
      title: 'Proof-of-Knowledge',
      description: 'Cryptographic verification system using EIP-712 signatures to prove learning achievements and prevent fraud'
    },
    {
      icon: <Target size={48} />,
      title: 'Learn-to-Win Platform',
      description: 'Gamified learning experience with courses, challenges, AI tasks, and progressive difficulty levels'
    },
    {
      icon: <Zap size={48} />,
      title: 'Multi-Chain Bridge',
      description: 'LayerZero OFT adapter enables secure token transfers across multiple blockchains'
    },
    {
      icon: <Lock size={48} />,
      title: 'Security First',
      description: 'Anti-fraud protections, rate limiting, cooldown periods, and emergency pause mechanisms'
    },
    {
      icon: <Users size={48} />,
      title: 'Gas Efficient',
      description: 'EIP-2612 permit support for gasless approvals and batch processing for optimal efficiency'
    }
  ]

  return (
    <section id="features" className="features-section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Core Features
        </motion.h2>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              className="feature-card glass"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features