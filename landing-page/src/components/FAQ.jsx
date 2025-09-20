import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'
import './FAQ.css'

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null)

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const faqData = [
    {
      question: 'What is NEURONS Protocol?',
      answer: 'NEURONS Protocol is a blockchain-based Learn-to-Win platform that combines education with cryptocurrency rewards. Users earn NEURONS tokens by completing courses, challenges, and AI-driven tasks while proving their knowledge through cryptographic verification.'
    },
    {
      question: 'How does Proof-of-Knowledge work?',
      answer: 'Proof-of-Knowledge uses EIP-712 cryptographic signatures to verify learning achievements. When users complete educational content, they generate cryptographic proofs that prevent fraud and ensure genuine participation, making the learning process transparent and verifiable.'
    },
    {
      question: 'What is the total supply of NEURONS tokens?',
      answer: 'NEURONS has a fixed total supply of 10,000,000 tokens. All tokens are minted at deployment with no inflation mechanism, ensuring scarcity and value preservation over time.'
    },
    {
      question: 'How can I earn NEURONS tokens?',
      answer: 'You can earn NEURONS tokens by participating in the Learn-to-Win platform: completing educational courses, solving challenges, participating in AI-driven tasks, and proving your knowledge through the Proof-of-Knowledge system.'
    },
    {
      question: 'Is NEURONS Protocol multi-chain?',
      answer: 'Yes, NEURONS Protocol supports multi-chain functionality through LayerZero OFT (Omnichain Fungible Token) adapter, enabling secure token transfers across multiple blockchain networks.'
    },
    {
      question: 'What security measures are in place?',
      answer: 'NEURONS Protocol implements multiple security layers including anti-fraud protections, rate limiting, cooldown periods, emergency pause mechanisms, role-based access controls, and EIP-712 signature verification.'
    },
    {
      question: 'How is gas efficiency achieved?',
      answer: 'The protocol uses EIP-2612 permit functionality for gasless approvals, batch processing for multiple operations, and optimized smart contract architecture to minimize transaction costs.'
    },
    {
      question: 'When will the platform launch?',
      answer: 'NEURONS Protocol is currently in development. Follow our official channels for updates on testnet releases, mainnet launch, and platform availability.'
    }
  ]

  return (
    <section id="faq" className="faq-section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Frequently Asked Questions
        </motion.h2>

        <div className="faq-container">
          {faqData.map((faq, index) => (
            <motion.div
              key={index}
              className="faq-item glass"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <button
                className="faq-question"
                onClick={() => toggleFAQ(index)}
                aria-expanded={openIndex === index}
              >
                <span className="question-text">{faq.question}</span>
                <motion.div
                  className="faq-icon"
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {openIndex === index ? <Minus size={20} /> : <Plus size={20} />}
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    className="faq-answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="answer-content">
                      <p>{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ