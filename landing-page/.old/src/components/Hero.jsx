import React from 'react'
import { motion } from 'framer-motion'
import './Hero.css'
import neuronsBkg from '../assets/neurons-bkg.png'

const Hero = () => {
  const handleCTAClick = (e) => {
    e.preventDefault()
    const target = document.querySelector('#how-it-works')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  }

  const techBadges = [
    'ERC-20',
    'OpenZeppelin v5',
    'EIP-712',
    'LayerZero',
    'Solidity ^0.8.20'
  ]

  return (
    <section className="hero" style={{ 'background-image': `url(${neuronsBkg})` }}>
      <div className="container hero-container">
        <motion.div
          className="hero-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 variants={itemVariants} className="hero-title">
            Learn to Earn
          </motion.h1>
          
          <motion.p variants={itemVariants} className="hero-description">
            Get rewarded with <strong>NEURONS tokens</strong> for learning, completing challenges, 
            and demonstrating knowledge on the blockchain
          </motion.p>
          
          <motion.div variants={itemVariants}>
            <button className="btn-primary hero-cta" onClick={handleCTAClick}>
              Start Learning & Earning
            </button>
          </motion.div>
          
          <motion.div variants={itemVariants} className="tech-stack">
            {techBadges.map((badge, index) => (
              <motion.span 
                key={badge}
                className="tech-badge"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + index * 0.1 }}
              >
                {badge}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default Hero