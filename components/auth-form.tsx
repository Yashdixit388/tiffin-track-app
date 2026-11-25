'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, ShieldCheck, Soup, Sparkles } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'owner' | 'customer'>('customer')
  const [businessName, setBusinessName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [shouldSetupAccount, setShouldSetupAccount] = useState(false)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === 'sign-up'

  const finishAccountSetup = async () => {
    if (!shouldSetupAccount) return

    if (role === 'owner') {
      const setup = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize-business', name: businessName }),
      })
      if (!setup.ok) {
        const response = await setup.json()
        throw new Error(response.error ?? 'Your account was created, but business setup could not finish.')
      }
    } else if (joinCode.trim()) {
      const join = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join-business', code: joinCode }),
      })
      if (!join.ok) {
        const response = await join.json()
        throw new Error(response.error ?? 'Your account was created, but the business could not be joined.')
      }
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    try {
      if (isVerifyingEmail) {
        if (!emailVerified) {
          const result = await authClient.emailOtp.verifyEmail({ email, otp: verificationCode })
          if (result.error) {
            setError(result.error.message ?? 'That verification code could not be accepted.')
            return
          }
          setEmailVerified(true)
        }

        await finishAccountSetup()
        router.push('/dashboard')
        router.refresh()
        return
      }

      const result = isSignUp
        ? await authClient.signUp.email({ email, password, name, role })
        : await authClient.signIn.email({ email, password })

      if (result.error) {
        if (!isSignUp && result.error.code === 'EMAIL_NOT_VERIFIED') {
          setIsVerifyingEmail(true)
          setShouldSetupAccount(false)
          setNotice(`We sent a six-digit verification code to ${email}.`)
          return
        }
        setError(result.error.message ?? 'Something went wrong')
        return
      }

      if (isSignUp) {
        setIsVerifyingEmail(true)
        setShouldSetupAccount(true)
        setNotice(`We sent a six-digit verification code to ${email}.`)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'The request could not be completed.')
    } finally {
      setLoading(false)
    }
  }

  const resendVerificationCode = async () => {
    setError(null)
    setNotice(null)
    setLoading(true)
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })
      if (result.error) {
        setError(result.error.message ?? 'A new verification code could not be sent.')
        return
      }
      setNotice(`A new verification code was sent to ${email}.`)
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'A new verification code could not be sent.')
    } finally {
      setLoading(false)
    }
  }

  const changeEmail = () => {
    setIsVerifyingEmail(false)
    setEmailVerified(false)
    setVerificationCode('')
    setError(null)
    setNotice(null)
  }

  return (
    <main className="min-h-svh bg-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-svh flex-col justify-between overflow-hidden bg-[#f04424] px-12 py-10 text-white lg:flex xl:px-16 xl:py-12">
        <div className="pointer-events-none absolute -right-36 -top-32 size-[520px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-12 -top-4 size-[360px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-48 -left-24 size-[420px] rounded-full bg-[#ff9575]/25" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-[15px] bg-white/15 ring-1 ring-white/20"><Soup size={24} /></div>
          <span className="text-xl font-extrabold tracking-[-0.05em]">Tiffin Tracker</span>
        </div>
        <div className="relative z-10 mx-auto w-full max-w-[530px] py-10">
          <div className="relative mb-10 flex h-[280px] items-center justify-center">
            <div className="absolute size-[255px] rounded-full border border-dashed border-white/40" />
            <div className="absolute size-[205px] rounded-full bg-white/10" />
            <div className="relative flex size-[150px] items-center justify-center rounded-[42px] bg-[#fff4ee] text-[#e74a2b] shadow-[0_26px_70px_rgba(114,33,17,0.22)]">
              <Soup size={74} strokeWidth={1.35} />
            </div>
            <span className="absolute right-[18%] top-[15%] flex size-12 items-center justify-center rounded-2xl bg-[#ffc76c] text-[#773c21] shadow-lg"><Sparkles size={21} /></span>
            <span className="absolute bottom-[18%] left-[14%] flex size-11 items-center justify-center rounded-2xl bg-white text-[#73905a] shadow-lg"><Check size={21} /></span>
            <div className="absolute right-[13%] bottom-[20%] rounded-2xl border border-white/20 bg-white/15 px-4 py-3 shadow-lg backdrop-blur-md">
              <p className="text-[10px] font-semibold text-white/75">A little more organized</p>
              <p className="mt-1 text-sm font-bold">Your week, sorted.</p>
            </div>
          </div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/75">A better kind of daily routine</p>
          <h1 className="max-w-[510px] text-[2.8rem] font-extrabold leading-[1.08] tracking-[-0.06em] xl:text-[3.55rem]">
            Good food deserves <span className="text-[#ffd28c]">good tracking.</span>
          </h1>
          <p className="mt-5 max-w-[430px] text-base leading-7 text-white/80">
            Keep your tiffins, payments, and peace of mind all in one beautifully simple place.
          </p>
        </div>
        <div className="relative z-10 flex items-center justify-between text-xs text-white/70">
          <span>Made for your everyday.</span>
          <span className="flex items-center gap-2"><ShieldCheck size={15} /> Private & secure</span>
        </div>
      </section>

      <section className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#fff9f5] px-5 py-10 sm:px-8 lg:bg-white">
        <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-[#fff0e8] lg:hidden" />
        <div className="relative z-10 w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-[14px] bg-primary text-white shadow-[0_8px_18px_rgba(240,68,36,0.2)]"><Soup size={22} /></div>
            <span className="text-lg font-extrabold tracking-[-0.04em]">Tiffin <span className="text-primary">Tracker</span></span>
          </div>
          <Card className="flex flex-col gap-0 overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none sm:rounded-none lg:bg-transparent">
            <div className="mb-7">
              <div className="mb-5 hidden size-11 items-center justify-center rounded-2xl bg-[#fff0e9] text-primary lg:flex"><Soup size={22} /></div>
              <p className="mb-2 text-sm font-bold text-primary">{isVerifyingEmail ? 'One quick security check' : isSignUp ? 'A fresh start' : 'Welcome back'}</p>
              <h2 className="text-[2rem] font-extrabold tracking-[-0.055em]">
                {isVerifyingEmail ? 'Verify your email' : isSignUp ? 'Create your account' : 'Good to see you again.'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {isVerifyingEmail
                  ? `Enter the six-digit code sent to ${email}. It expires in five minutes.`
                  : isSignUp
                    ? 'Let’s get your tiffin routine in order.'
                    : 'Sign in to pick up right where you left off.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {!isVerifyingEmail && isSignUp && (
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#fff0e9] p-1">
                  {(['customer', 'owner'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      className={`h-10 rounded-lg text-sm font-bold capitalize transition ${role === value ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {value === 'owner' ? 'Tiffin owner' : 'Customer'}
                    </button>
                  ))}
                </div>
              )}
              {!isVerifyingEmail && isSignUp && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" placeholder="How should we call you?" className="h-12 rounded-xl border-[#eadbd3] bg-white px-4 shadow-none" />
                </div>
              )}
              {!isVerifyingEmail && isSignUp && role === 'owner' && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="businessName">Tiffin service name</Label>
                  <Input id="businessName" value={businessName} onChange={(event) => setBusinessName(event.target.value)} required autoComplete="organization" placeholder="e.g. Sharma Tiffin Service" className="h-12 rounded-xl border-[#eadbd3] bg-white px-4 shadow-none" />
                </div>
              )}
              {!isVerifyingEmail && isSignUp && role === 'customer' && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="joinCode">Business invite code <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id="joinCode" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} autoComplete="off" placeholder="Ask your tiffin provider" className="h-12 rounded-xl border-[#eadbd3] bg-white px-4 uppercase shadow-none" />
                </div>
              )}
              {isVerifyingEmail && emailVerified && shouldSetupAccount && role === 'customer' && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="joinCode">Business invite code <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id="joinCode" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} autoComplete="off" placeholder="Ask your tiffin provider" className="h-12 rounded-xl border-[#eadbd3] bg-white px-4 uppercase shadow-none" />
                </div>
              )}
              {!isVerifyingEmail ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="you@example.com" className="h-12 rounded-xl border-[#eadbd3] bg-white px-4 shadow-none" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder="At least 8 characters" className="h-12 rounded-xl border-[#eadbd3] bg-white px-4 shadow-none" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="verificationCode">Email verification code</Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    required={!emailVerified}
                    disabled={emailVerified}
                    placeholder="6-digit code"
                    className="h-12 rounded-xl border-[#eadbd3] bg-white px-4 text-center text-lg tracking-[0.35em] shadow-none"
                  />
                </div>
              )}

              {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-destructive" role="alert">{error}</p>}
              {notice && <p className="rounded-xl border border-[#dce7cf] bg-[#f3f7ed] px-3.5 py-3 text-sm text-[#566b3e]" role="status">{notice}</p>}

              <Button type="submit" disabled={loading} className="mt-2 h-12 w-full rounded-xl bg-primary text-sm font-bold text-white shadow-[0_8px_18px_rgba(240,68,36,0.2)] hover:bg-[#d9381b]">
                {loading ? 'Please wait…' : isVerifyingEmail ? emailVerified ? 'Continue to your account' : 'Verify email' : isSignUp ? 'Create account' : 'Sign in'}
                {!loading && <ArrowRight size={17} />}
              </Button>
              {isVerifyingEmail && !emailVerified && (
                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => void resendVerificationCode()} disabled={loading} className="font-bold text-primary hover:underline disabled:opacity-50">
                    Resend code
                  </button>
                  <button type="button" onClick={changeEmail} disabled={loading} className="text-muted-foreground hover:text-foreground disabled:opacity-50">
                    Change email
                  </button>
                </div>
              )}
            </form>

            <p className="mt-7 text-center text-sm text-muted-foreground">
              {isVerifyingEmail ? (
                <button type="button" onClick={changeEmail} className="font-bold text-primary underline-offset-4 hover:underline">Back to {isSignUp ? 'sign up' : 'sign in'}</button>
              ) : (
                <>
                  {isSignUp ? 'Already have an account? ' : 'New to Tiffin Tracker? '}
                  <Link href={isSignUp ? '/sign-in' : '/sign-up'} className="font-bold text-primary underline-offset-4 hover:underline">
                    {isSignUp ? 'Sign in' : 'Create an account'}
                  </Link>
                </>
              )}
            </p>
          </Card>
          <p className="mt-8 text-center text-xs text-[#9a918c]">Your tiffin records stay yours. Always.</p>
        </div>
      </section>
    </main>
  )
}
