import React from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Shield, DollarSign, Globe } from 'lucide-react'
import './HowItWorks.css'

const HowItWorks = () => {
  const steps = [
    {
      number: 1,
      icon: <BookOpen size={24} />,
      title: 'Learn',
      description: 'Complete courses, quizzes, and AI-powered challenges on our Learn-to-Win platform'
    },
    {
      number: 2,
      icon: <Shield size={24} />,
      title: 'Prove',
      description: 'Our Proof-of-Knowledge system verifies your learning achievements cryptographically'
    },
    {
      number: 3,
      icon: <DollarSign size={24} />,
      title: 'Earn',
      description: 'Receive NEURONS tokens automatically minted to your wallet as rewards'
    },
    {
      number: 4,
      icon: <Globe size={24} />,
      title: 'Use',
      description: 'Trade, transfer across chains, or hold your tokens for future platform features'
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  return (
    <section id="how-it-works" className="how-it-works-section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          How It Works
        </motion.h2>
        
        <motion.div 
          className="steps-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {steps.map((step, index) => (
            <motion.div 
              key={step.number}
              className="step-card glass"
              variants={itemVariants}
              whileHover={{ 
                y: -5,
                transition: { duration: 0.2 }
              }}
            >
              <div className="step-number">
                <span>{step.number}</span>
              </div>
              
              <div className="step-icon">
                {step.icon}
              </div>
              
              <h3 className="step-title">
                {step.title}
              </h3>
              
              <p className="step-description">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default HowItWorks