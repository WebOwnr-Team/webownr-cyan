'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { TeamMember, CyanPersonalSettings } from '@/types'

// ─────────────────────────────────────────────
// useMember — current user's TeamMember profile
//
// Exposes:
//   - member profile data
//   - updateProfile() for name, status, Cyan settings
//   - isFounder convenience flag
// ─────────────────────────────────────────────

interface UseMemberReturn {
  member: TeamMember | null
  loading: boolean
  error: string | null
  isFounder: boolean
  updateProfile: (updates: {
    name?: string
    statusMessage?: string
    cyanSettings?: Partial<CyanPersonalSettings>
    department?: TeamMember['department']
  }) => Promise<void>
  refetch: () => void
}

export function useMember(): UseMemberReturn {
  const { getIdToken } = useAuth()
  const [member, setMember] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMember = useCallback(async () => {
    const token = await getIdToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/cyan/member', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json() as { member?: TeamMember; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to load profile')
      setMember(data.member ?? null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [getIdToken])

  useEffect(() => { void fetchMember() }, [fetchMember])

  const updateProfile = useCallback(async (updates: Parameters<UseMemberReturn['updateProfile']>[0]) => {
    const token = await getIdToken()
    if (!token) return
    try {
      const res = await fetch('/api/cyan/member', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Update failed')
      }
      // Optimistic update
      setMember(prev => prev ? {
        ...prev,
        ...(updates.name && { name: updates.name }),
        ...(updates.statusMessage !== undefined && { statusMessage: updates.statusMessage }),
        ...(updates.department && { department: updates.department }),
        ...(updates.cyanSettings && {
          cyanSettings: { ...prev.cyanSettings, ...updates.cyanSettings },
        }),
      } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }, [getIdToken])

  return {
    member,
    loading,
    error,
    isFounder: member?.role === 'founder',
    updateProfile,
    refetch: fetchMember,
  }
}
