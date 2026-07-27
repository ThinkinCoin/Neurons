import React from 'react'
import { motion } from 'framer-motion'
import { PieChart, TrendingUp, DollarSign, Clock } from 'lucide-react'
import './Tokenomics.css'

const Tokenomics = () => {
  const tokenomicsData = [
    {
      icon: <PieChart size={32} />,
      label: 'Total Supply',
      value: '10,000,000 NEURONS',
      description: 'Fixed supply with no inflation'
    },
    {
      icon: <TrendingUp size={32} />,
      label: 'Initial Distribution',
      value: '100% Minted',
      description: 'All tokens minted at deployment'
    },
    {
      icon: <DollarSign size={32} />,
      label: 'Utility',
      value: 'Platform Currency',
      description: 'Used for courses, challenges, and rewards'
    },
    {
      icon: <Clock size={32} />,
      label: 'Vesting',
      value: 'Progressive Unlock',
      description: 'Tokens unlocked through platform participation'
    }
  ]

  const distributionData = [
    { category: 'Community Rewards', percentage: 40, color: '#52b788' },
    { category: 'Platform Development', percentage: 25, color: '#40795c' },
    { category: 'Team & Advisors', percentage: 20, color: '#2d5a3d' },
    { category: 'Partnerships', percentage: 10, color: '#95d5b2' },
    { category: 'Liquidity Pool', percentage: 5, color: '#1b4332' }
  ]

  return (
    <section id="tokenomics" className="tokenomics-section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Tokenomics
        </motion.h2>

        <div className="tokenomics-content">
          <div className="tokenomics-stats">
            {tokenomicsData.map((item, index) => (
              <motion.div
                key={index}
                className="stat-card glass"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="stat-icon">{item.icon}</div>
                <div className="stat-content">
                  <h3 className="stat-label">{item.label}</h3>
                  <p className="stat-value">{item.value}</p>
                  <p className="stat-description">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="distribution-chart glass"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h3 className="chart-title">Token Distribution</h3>
            <div className="chart-container">
              {distributionData.map((item, index) => (
                <motion.div
                  key={index}
                  className="distribution-item"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="distribution-bar">
                    <motion.div
                      className="distribution-fill"
                      style={{ backgroundColor: item.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.percentage}%` }}
                      transition={{ duration: 1, delay: 0.7 + index * 0.1 }}
                      viewport={{ once: true }}
                    />
                  </div>
                  <div className="distribution-info">
                    <span className="distribution-category">{item.category}</span>
                    <span className="distribution-percentage">{item.percentage}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Tokenomics