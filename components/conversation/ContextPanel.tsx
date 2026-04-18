'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useBusinessContext } from '@/hooks'
import { CyanOrbInline } from '@/components/ui/CyanOrb'
import { Badge } from '@/components/ui/Badge'
import { formatNGN } from '@/lib/utils'
import type { ConversationMode } from '@/types'

interface ContextPanelProps {
  mode: ConversationMode
}

// ─────────────────────────────────────────────
// ContextPanel — right panel
//
// Shows the founder what data Cyan is using.
// Builds transparency and trust.
// Collapsible sections — not overwhelming.
// Per the design brief: "shows what data Cyan currently has"
// ─────────────────────────────────────────────

type Section = 'business' | 'goals' | 'performance' | 'memory'

export function ContextPanel({ mode }: ContextPanelProps) {
  const { context, loading } = useBusinessContext()
  const [expanded, setExpanded] = useState<Set<Section>>(new Set(['business']))

  function toggle(section: Section) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })
  }

  if (loading) {
    return (
      <div style={panelStyle}>
        <PanelHeader mode={mode} />
        <div style={{ padding: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8, marginBottom: 8 }} />
          ))}
        </div>
      </div>
    )
  }

  if (!context) return (
    <div style={panelStyle}>
      <PanelHeader mode={mode} />
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Context loading…</p>
      </div>
    </div>
  )

  const { identity, goals, performance, cyanMemory } = context
  const openRecs = cyanMemory.openRecommendations.filter(r => r.status === 'open')

  return (
    <div style={panelStyle}>
      <PanelHeader mode={mode} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>

        {/* Business identity */}
        <ContextSection
          title="Business"
          expanded={expanded.has('business')}
          onToggle={() => toggle('business')}
        >
          <ContextRow label="Name" value={identity.businessName} />
          <ContextRow label="Industry" value={identity.industry} />
          <ContextRow label="Type" value={identity.productType} highlight />
          <ContextRow label="Customer" value={identity.targetCustomer} wrap />
        </ContextSection>

        {/* Goals */}
        <ContextSection
          title="Goals"
          expanded={expanded.has('goals')}
          onToggle={() => toggle('goals')}
        >
          <ContextRow label="90-day" value={goals.primary90Day} wrap />
          {goals.sixMonthRevenue > 0 && (
            <ContextRow label="6-month target" value={formatNGN(goals.sixMonthRevenue, true)} highlight />
          )}
          {goals.currentChallenges.length > 0 && (
            <ContextRow label="Challenges" value={goals.currentChallenges.join(', ')} wrap />
          )}
        </ContextSection>

        {/* Performance */}
        <ContextSection
          title="Performance"
          expanded={expanded.has('performance')}
          onToggle={() => toggle('performance')}
        >
          <ContextRow
            label="Avg weekly rev"
            value={performance.avgWeeklyRevenue > 0 ? formatNGN(performance.avgWeeklyRevenue, true) : 'Not set'}
            highlight={performance.avgWeeklyRevenue > 0}
          />
          <ContextRow
            label="Baseline"
            value={performance.revenueBaseline > 0 ? formatNGN(performance.revenueBaseline, true) : 'Not set'}
          />
          <ContextRow label="Growth rate" value={`${performance.growthRate}%`} />
          {performance.topProducts.length > 0 && (
            <ContextRow label="Top products" value={performance.topProducts.slice(0, 3).join(', ')} wrap />
          )}
        </ContextSection>

        {/* Cyan memory */}
        <ContextSection
          title="Cyan memory"
          expanded={expanded.has('memory')}
          onToggle={() => toggle('memory')}
        >
          <ContextRow
            label="Open recs"
            value={openRecs.length > 0 ? `${openRecs.length} active` : 'None'}
            highlight={openRecs.length > 0}
          />
          {cyanMemory.conversationSummary ? (
            <ContextRow label="Summary" value={cyanMemory.conversationSummary} wrap />
          ) : (
            <ContextRow label="Summary" value="Builds after 10+ messages" />
          )}
        </ContextSection>

      </div>

      {/* Footer note */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border-dim)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Info size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Cyan uses this data for every response. Update in Settings.
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const MODE_LABELS: Record<ConversationMode, string> = {
  strategy:   'Strategy',
  operations: 'Operations',
  content:    'Content',
  team:       'Team',
}

function PanelHeader({ mode }: { mode: ConversationMode }) {
  return (
    <div style={{
      padding: '16px 16px 12px',
      borderBottom: '1px solid var(--border-dim)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <CyanOrbInline size={16} />
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            Business Context
          </span>
        </div>
        <Badge variant="cyan">{MODE_LABELS[mode]}</Badge>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        What Cyan knows about your business right now
      </p>
    </div>
  )
}

function ContextSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--border-dim)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '8px 16px',
          background: 'none', border: 'none', cursor: 'pointer',
          transition: 'background 150ms',
        }}
      >
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
          fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {title}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '4px 16px 10px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function ContextRow({
  label,
  value,
  highlight = false,
  wrap = false,
}: {
  label: string
  value: string
  highlight?: boolean
  wrap?: boolean
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: wrap ? 'column' : 'row',
      gap: wrap ? 2 : 8, marginBottom: 6, alignItems: wrap ? 'flex-start' : 'baseline',
    }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, minWidth: wrap ? 'auto' : 72 }}>
        {label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: highlight ? 600 : 400,
        color: highlight ? 'var(--text-primary)' : 'var(--text-secondary)',
        lineHeight: 1.4,
        overflow: wrap ? 'visible' : 'hidden',
        textOverflow: wrap ? 'clip' : 'ellipsis',
        whiteSpace: wrap ? 'normal' : 'nowrap',
      }}>
        {value || '—'}
      </span>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: 'var(--navy-mid)',
  borderLeft: '1px solid var(--border)',
}
