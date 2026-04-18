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
    <div className="w-full max-w-md px-4 animate-fade-up">
      {/* Cyan orb */}
      <div className="flex justify-center mb-8">
        <div
          className="cyan-pulse"
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #00D4FF, #0088AA)',
          }}
        />
      </div>

      {/* Heading */}
      <div className="text-center mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>
          Open your business
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Cyan will be ready to help the moment you sign up
        </p>
      </div>

      {/* Card */}
      <div className="card p-8">

        {error && (
          <div className="alert-orange flex items-start gap-3 p-3 mb-5">
            <AlertCircle size={16} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: 'var(--orange)', fontSize: 13 }}>{error}</span>
          </div>
        )}

        {/* Google */}
        <button
          onClick={handleGoogleRegister}
          disabled={googleLoading || loading}
          className="btn-secondary w-full flex items-center justify-center gap-3 py-3 px-4 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontSize: 14 }}
        >
          {googleLoading ? (
            <span className="flex gap-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="divider flex-1" />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>or</span>
          <div className="divider flex-1" />
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              Business email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="form-input w-full px-4 py-3"
              placeholder="you@yourbusiness.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="form-input w-full px-4 py-3 pr-10"
                placeholder="Create a strong password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ fontSize: 14 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn-ghost absolute right-3 top-1/2 -translate-y-1/2 p-1"
                tabIndex={-1}
              >
                {showPassword
                  ? <EyeOff size={15} style={{ color: 'var(--text-muted)' }} />
                  : <Eye size={15} style={{ color: 'var(--text-muted)' }} />
                }
              </button>
            </div>

            {/* Password requirements */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                {PASSWORD_REQUIREMENTS.map(req => (
                  <div key={req.label} className="flex items-center gap-2">
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: req.test(password) ? 'var(--green)' : 'var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 200ms',
                      }}
                    >
                      {req.test(password) && <Check size={9} color="var(--navy)" strokeWidth={3} />}
                    </div>
                    <span style={{
                      fontSize: 12,
                      color: req.test(password) ? 'var(--green)' : 'var(--text-muted)',
                      transition: 'color 200ms',
                    }}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading || !passwordStrong}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: 14 }}
          >
            {loading ? (
              <span className="flex gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
            ) : (
              <>
                Create account <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-6" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-center mt-6" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        By creating an account you agree to our{' '}
        <Link href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</Link>
      </p>

      <p className="text-center mt-2" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Cyan is a <span style={{ color: 'var(--text-secondary)' }}>WebOwnr</span> product
      </p>
    </div>
  )
}
