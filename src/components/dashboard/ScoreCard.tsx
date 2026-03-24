'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './ScoreCard.module.css'

interface Player {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
}

const ScoreCard: React.FC<{ player: Player }> = ({ player }) => {
  const isOnFire = player.strikeRate >= 200 && player.balls >= 10

  return (
    <motion.div 
      className={`${styles.card} ${isOnFire ? styles.onFire : ''}`}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.playerInfo}>
        <span className={styles.name}>{player.name}</span>
        {isOnFire && <span className={styles.fireBadge}>ON FIRE 🔥</span>}
      </div>
      
      <div className={styles.stats}>
        <div className={styles.statGroup}>
          <span className={styles.valBig}>{player.runs}</span>
          <span className={styles.subText}>({player.balls})</span>
        </div>
        <div className={styles.statGroupSmall}>
          <span className={styles.label}>SR:</span>
          <span className={styles.val}>{(player.strikeRate || 0).toFixed(1)}</span>
        </div>
      </div>

      <div className={styles.boundaryCounts}>
        <span>4s: {player.fours}</span>
        <span>6s: {player.sixes}</span>
      </div>
    </motion.div>
  )
}

export default ScoreCard
