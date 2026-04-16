import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileLayout from '@/components/layout/ProfileLayout'
import styles from './Subscription.module.scss'

// ─── Plan data ────────────────────────────────────────────────────────────────
interface Plan {
  id:          string
  name:        string
  price:       number
  period:      string
  model?:      string
  badge?:      string
  recommended: boolean
  features:    string[]
  cta:         string
}

const plans: Plan[] = [
  {
    id:          'free',
    name:        'Free',
    price:       0,
    period:      'forever',
    model:       'gemini-2.5-flash-lite',
    recommended: false,
    cta:         'Get started',
    features: [
      'Limited usage per day',
      'Basic chat with PDFs',
      'PDF upload support (2 MB)',
      'Standard response speed',
      'Community support',
    ],
  },
  {
    id:          'prime',
    name:        'Prime',
    price:       20,
    period:      'per month',
    badge:       'Most Popular',
    recommended: true,
    cta:         'Choose Prime',
    features: [
      'Faster AI responses',
      'Higher daily usage limits',
      'Better model performance',
      'Larger PDF uploads (10 MB)',
      'Priority email support',
    ],
  },
  {
    id:          'prime_plus',
    name:        'Prime Plus',
    price:       100,
    period:      'per month',
    recommended: false,
    cta:         'Choose Prime Plus',
    features: [
      'Maximum usage — no limits',
      'Priority AI responses',
      'Best model performance',
      'Unlimited PDF uploads',
      'Dedicated support & SLA',
    ],
  },
]

// ─── PricingCard ──────────────────────────────────────────────────────────────
interface PricingCardProps {
  plan:          Plan
  isActive:      boolean
  onChoose:      (id: string) => void
}

const CheckIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const PricingCard: React.FC<PricingCardProps> = ({ plan, isActive, onChoose }) => (
  <div
    className={[
      styles.card,
      plan.recommended ? styles.recommended : '',
      isActive         ? styles.active      : '',
    ].filter(Boolean).join(' ')}
  >
    {/* Badge */}
    {plan.badge && (
      <div className={styles.badge}>{plan.badge}</div>
    )}

    {/* Header */}
    <div className={styles.cardHeader}>
      <h2 className={styles.planName}>{plan.name}</h2>
      {plan.model && (
        <span className={styles.modelTag}>{plan.model}</span>
      )}
    </div>

    {/* Price */}
    <div className={styles.priceRow}>
      <span className={styles.currency}>$</span>
      <span className={styles.price}>{plan.price}</span>
      <span className={styles.period}>/{plan.period}</span>
    </div>

    {/* Divider */}
    <div className={styles.divider} />

    {/* Features */}
    <ul className={styles.features}>
      {plan.features.map((f, i) => (
        <li key={i} className={styles.feature}>
          <span className={styles.featureIcon}><CheckIcon /></span>
          {f}
        </li>
      ))}
    </ul>

    {/* CTA */}
    <button
      className={[
        styles.ctaBtn,
        plan.recommended ? styles.ctaPrimary : styles.ctaSecondary,
      ].join(' ')}
      onClick={() => onChoose(plan.id)}
    >
      {plan.cta}
    </button>
  </div>
)

// ─── Subscription Page ────────────────────────────────────────────────────────
const Subscription: React.FC = () => {
  const navigate  = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)
  const [toast,    setToast]    = useState<string | null>(null)

  const handleChoose = (id: string) => {
    setSelected(id)
    if (id === 'free') {
      showToast("You're already on the Free plan!")
    } else {
      showToast('Payment integration coming soon!')
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <ProfileLayout>
      <div className={styles.page}>

        {/* Back */}
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroIcon}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path d="M18 4L10 17h7l-3 11 10-14h-7z" fill="currentColor" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={styles.heroTitle}>Choose your plan</h1>
          <p className={styles.heroSub}>
            Start free, upgrade when you need more power.
          </p>
        </div>

        {/* Cards grid */}
        <div className={styles.grid}>
          {plans.map(plan => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isActive={selected === plan.id}
              onChoose={handleChoose}
            />
          ))}
        </div>

        {/* Footer note */}
        <p className={styles.footerNote}>
          All plans include PDF upload support. Cancel anytime.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={styles.toast}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8"  x2="12"   y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {toast}
        </div>
      )}
    </ProfileLayout>
  )
}

export default Subscription