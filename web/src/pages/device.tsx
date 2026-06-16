import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearch } from '@tanstack/react-router'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { fetchJson, getCsrfHeaders } from '@/api/client'
import { truncateErrorMessage } from '@/shared/lib/error-display'
import { useAuth } from '@/features/auth/use-auth'
import { LoginButton } from '@/features/auth/login-button'

async function authorizeDevice(userCode: string): Promise<void> {
  await fetchJson<void>('/api/v1/device/authorize', {
    method: 'POST',
    headers: getCsrfHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ userCode }),
  })
}

export function DeviceAuthPage() {
  const { t } = useTranslation()
  const { user, isLoading: authLoading } = useAuth()
  const search = useSearch({ from: '/device' })
  const [part1, setPart1] = useState('')
  const [part2, setPart2] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const input1Ref = useRef<HTMLInputElement>(null)
  const input2Ref = useRef<HTMLInputElement>(null)
  const hasAutoApprovedRef = useRef(false)

  // Auto-approve when user is authenticated and a code is in the URL
  useEffect(() => {
    if (authLoading || !user) return
    if (hasAutoApprovedRef.current) return

    const code = search.code
    if (!code) {
      input1Ref.current?.focus()
      return
    }

    const normalized = code.toUpperCase()
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized)) {
      input1Ref.current?.focus()
      return
    }

    hasAutoApprovedRef.current = true
    const [p1, p2] = normalized.split('-')
    setPart1(p1)
    setPart2(p2)
    setIsSubmitting(true)

    authorizeDevice(normalized)
      .then(() => {
        setMessage({ type: 'success', text: t('device.success') })
        setClosing(true)
        setTimeout(() => { window.close() }, 1500)
      })
      .catch((error) => {
        hasAutoApprovedRef.current = false
        setPart1('')
        setPart2('')
        setMessage({
          type: 'error',
          text: truncateErrorMessage(error instanceof Error ? error.message : t('device.defaultError')) ?? t('device.defaultError'),
        })
        input1Ref.current?.focus()
      })
      .finally(() => setIsSubmitting(false))
  }, [authLoading, user, search.code, t])

  const handlePart1Change = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
    setPart1(cleaned)
    if (cleaned.length === 4) {
      input2Ref.current?.focus()
    }
  }

  const handlePart2Change = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
    setPart2(cleaned)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '')

    if (pasted.length >= 8) {
      setPart1(pasted.slice(0, 4))
      setPart2(pasted.slice(4, 8))
      input2Ref.current?.focus()
    } else if (pasted.length > 0) {
      setPart1(pasted.slice(0, 4))
      if (pasted.length > 4) {
        setPart2(pasted.slice(4))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (part1.length !== 4 || part2.length !== 4) {
      setMessage({ type: 'error', text: t('device.incompleteCode') })
      return
    }

    const userCode = `${part1}-${part2}`
    setIsSubmitting(true)
    setMessage(null)

    try {
      await authorizeDevice(userCode)
      setMessage({ type: 'success', text: t('device.success') })
      setPart1('')
      setPart2('')
      // Close the tab if it was opened with a code (i.e. from CLI flow)
      if (search.code) {
        setClosing(true)
        setTimeout(() => { window.close() }, 1500)
      } else {
        input1Ref.current?.focus()
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: truncateErrorMessage(error instanceof Error ? error.message : t('device.defaultError')) ?? t('device.defaultError'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Not logged in + has code → show inline login prompt to preserve the code through OAuth flow
  if (!authLoading && !user && search.code) {
    const returnTo = `/device?code=${search.code}`
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 animate-fade-up">
        <Card className="w-full max-w-md p-8 space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent items-center justify-center shadow-glow mb-2 mx-auto">
              <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold font-heading">{t('device.title')}</h1>
            <p className="text-muted-foreground">{t('device.loginRequired')}</p>
          </div>
          <LoginButton returnTo={returnTo} />
          <div className="text-center text-sm text-muted-foreground">
            <p>{t('device.notice')}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 animate-fade-up">
      <Card className="w-full max-w-md p-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent items-center justify-center shadow-glow mb-2 mx-auto">
            <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold font-heading">{t('device.title')}</h1>
          <p className="text-muted-foreground">
            {t('device.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>{t('device.codeLabel')}</Label>
            <div className="flex items-center gap-3">
              <Input
                ref={input1Ref}
                type="text"
                value={part1}
                onChange={(e) => handlePart1Change(e.target.value)}
                onPaste={handlePaste}
                placeholder="XXXX"
                className="text-center text-2xl font-mono tracking-wider"
                maxLength={4}
              />
              <span className="text-2xl font-bold text-muted-foreground">-</span>
              <Input
                ref={input2Ref}
                type="text"
                value={part2}
                onChange={(e) => handlePart2Change(e.target.value)}
                onPaste={handlePaste}
                placeholder="XXXX"
                className="text-center text-2xl font-mono tracking-wider"
                maxLength={4}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('device.codeHint')}
            </p>
          </div>

          {message && (
            <div
              className={`p-4 rounded-xl text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {message.text}
              {closing && (
                <p className="mt-1 text-xs opacity-75">{t('device.autoCloseNotice')}</p>
              )}
              {message.type === 'success' && !closing && (
                <p className="mt-1 text-xs opacity-75">{t('device.closeTab')}</p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || part1.length !== 4 || part2.length !== 4}
          >
            {isSubmitting ? t('device.submitting') : t('device.submit')}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <p>{t('device.notice')}</p>
        </div>
      </Card>
    </div>
  )
}
