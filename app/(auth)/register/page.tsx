'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, AlertCircle, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
]

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function RegisterPage() {
  const { signUpEmail, signInGoogle } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordStrong = PASSWORD_REQUIREMENTS.every(r => r.test(password))

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    if (!passwordStrong) {
      setError('Please meet all password requirements.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await signUpEmail(email, password)
      router.push('/onboarding')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      await signInGoogle()
      router.push('/onboarding')
    } catch {
      setError('Google sign-in failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

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

        {/* Cyan orb */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div
            className="cyan-pulse"
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #00D4FF, #0088AA)',
              flexShrink: 0,
            }}
          />
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(22px, 5vw, 28px)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 8,
            lineHeight: 1.2,
          }}>
            Open your workspace
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
            Cyan will be ready to help the moment you sign up
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 'clamp(24px, 6vw, 36px)' }}>

          {/* Error */}
          {error && (
            <div className="alert-orange" style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              marginBottom: 20,
              borderRadius: 10,
            }}>
              <AlertCircle size={16} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: 'var(--orange)', fontSize: 13, lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleRegister}
            disabled={googleLoading || loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '13px 20px',
              marginBottom: 16,
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 500,
              cursor: googleLoading || loading ? 'not-allowed' : 'pointer',
              opacity: googleLoading || loading ? 0.5 : 1,
              transition: 'opacity 150ms, border-color 150ms',
              minHeight: 48,
            }}
          >
            {googleLoading ? (
              <span style={{ display: 'flex', gap: 4 }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                }}
              >
                Business email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="form-input"
                placeholder="you@yourbusiness.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: 15,
                  padding: '13px 16px',
                  borderRadius: 10,
                  boxSizing: 'border-box',
                  minHeight: 48,
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                }}
              >
                Password
              </label>

              {/* Input wrapper — keeps eye icon inside the border */}
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="form-input"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    fontSize: 15,
                    padding: '13px 48px 13px 16px',
                    borderRadius: 10,
                    boxSizing: 'border-box',
                    minHeight: 48,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
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
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: met ? 'var(--green)' : 'var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'background 200ms',
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || googleLoading || !passwordStrong}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '13px 20px',
                background: loading || googleLoading || !passwordStrong
                  ? 'var(--border)'
                  : 'var(--cyan)',
                border: 'none',
                borderRadius: 10,
                color: loading || googleLoading || !passwordStrong
                  ? 'var(--text-muted)'
                  : 'var(--navy)',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading || googleLoading || !passwordStrong ? 'not-allowed' : 'pointer',
                transition: 'background 200ms, color 200ms',
                minHeight: 48,
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', gap: 4 }}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              ) : (
                <>
                  Create account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Sign in link */}
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          By creating an account you agree to our{' '}
          <Link href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          Cyan is a <span style={{ color: 'var(--text-secondary)' }}>WebOwnr</span> product
        </p>

      </div>
    </div>
  )
}