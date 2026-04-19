'use client'

import { useState, useEffect, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, AlertCircle, Check, Building2 } from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase/firebaseConfig'

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter',  test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number',            test: (p: string) => /[0-9]/.test(p) },
]

interface InviteDetails {
  email: string
  name: string
  role: string
  businessName: string
}

// ─────────────────────────────────────────────
// Inner component — reads searchParams (must be inside Suspense)
// ─────────────────────────────────────────────

function AcceptInviteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const passwordStrong = PASSWORD_REQUIREMENTS.every(r => r.test(password))

  // Load invite details
  useEffect(() => {
    if (!token) {
      setInviteError('No invite token found in this link. Make sure you used the full link from your email.')
      setLoadingInvite(false)
      return
    }

    fetch(`/api/cyan/invite/accept?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setInviteError(data.error)
        } else {
          setInvite(data)
        }
      })
      .catch(() => setInviteError('Failed to load invite details. Please try again.'))
      .finally(() => setLoadingInvite(false))
  }, [token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!passwordStrong || !token || !invite) return

    setSubmitError(null)
    setSubmitting(true)

    try {
      // 1. Accept invite + create Firebase Auth user
      const res = await fetch('/api/cyan/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Something went wrong.')
      }

      // 2. Sign in automatically
      await signInWithEmailAndPassword(auth, invite.email, password)

      // 3. Navigate to dashboard
      router.push('/dashboard')

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading state ──────────────────────────
  if (loadingInvite) {
    return (
      <div style={centeredStyle}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    )
  }

  // ── Invalid invite ─────────────────────────
  if (inviteError || !invite) {
    return (
      <div style={centeredStyle}>
        <div style={{ width: '100%', maxWidth: 440, padding: '0 16px', textAlign: 'center' }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '36px 32px',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(255,107,53,0.1)',
              border: '1px solid rgba(255,107,53,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <AlertCircle size={22} style={{ color: 'var(--orange)' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 10 }}>
              Invite not found
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              {inviteError}
            </p>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 14, color: 'var(--cyan)', textDecoration: 'none', fontWeight: 600,
            }}>
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Valid invite — set password ────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--navy)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }} className="animate-fade-up">

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            fontFamily: 'var(--font-display)', letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            WebOwnr · Cyan
          </span>
        </div>

        {/* Business badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, marginBottom: 20,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,212,255,0.07)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 999,
            padding: '6px 14px',
          }}>
            <Building2 size={13} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontSize: 13, color: 'var(--cyan)', fontWeight: 600 }}>
              {invite.businessName}
            </span>
          </div>
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(20px, 5vw, 26px)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 8,
            lineHeight: 1.2,
          }}>
            You&apos;ve been invited
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            Set a password to activate your access to{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {invite.businessName}
            </span>
            &apos;s workspace.
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 'clamp(24px, 6vw, 36px)' }}>

          {/* Pre-filled identity */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Name</span>
                <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{invite.name}</span>
              </div>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Email</span>
                <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{invite.email}</span>
              </div>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Role</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {invite.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', marginBottom: 20,
              background: 'rgba(255,107,53,0.08)',
              border: '1px solid rgba(255,107,53,0.25)',
              borderRadius: 10,
            }}>
              <AlertCircle size={16} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: 'var(--orange)', fontSize: 13, lineHeight: 1.5 }}>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label
                htmlFor="password"
                style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: 'var(--text-secondary)', marginBottom: 8,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                }}
              >
                Create a password
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '13px 48px 13px 16px',
                    fontSize: 15,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                    minHeight: 50,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: 48,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    borderRadius: '0 10px 10px 0',
                  }}
                >
                  {showPassword
                    ? <EyeOff size={16} style={{ color: 'var(--text-muted)' }} />
                    : <Eye size={16} style={{ color: 'var(--text-muted)' }} />
                  }
                </button>
              </div>

              {/* Password requirements */}
              {password.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {PASSWORD_REQUIREMENTS.map(req => {
                    const met = req.test(password)
                    return (
                      <div key={req.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%',
                          background: met ? 'var(--green)' : 'var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'background 200ms',
                        }}>
                          {met && <Check size={10} color="var(--navy)" strokeWidth={3} />}
                        </div>
                        <span style={{
                          fontSize: 12,
                          color: met ? 'var(--green)' : 'var(--text-muted)',
                          transition: 'color 200ms',
                        }}>
                          {req.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !passwordStrong}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '13px 20px',
                background: submitting || !passwordStrong ? 'var(--border)' : 'var(--cyan)',
                border: 'none', borderRadius: 10,
                color: submitting || !passwordStrong ? 'var(--text-muted)' : 'var(--navy)',
                fontSize: 15, fontWeight: 700,
                cursor: submitting || !passwordStrong ? 'not-allowed' : 'pointer',
                transition: 'background 200ms, color 200ms',
                minHeight: 50,
                fontFamily: 'var(--font-display)',
              }}
            >
              {submitting ? (
                <span style={{ display: 'flex', gap: 4 }}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              ) : (
                <>
                  Activate workspace access <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          Cyan is a <span style={{ color: 'var(--text-secondary)' }}>WebOwnr</span> product
        </p>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Page wrapper with Suspense (required for useSearchParams)
// ─────────────────────────────────────────────

const centeredStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--navy)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div style={centeredStyle}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    }>
      <AcceptInviteInner />
    </Suspense>
  )
}