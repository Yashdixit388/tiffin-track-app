'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Download,
  Home,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Package,
  Plus,
  Settings,
  Soup,
  Sparkles,
  Trash2,
  Users,
  Utensils,
  Wallet,
  X,
} from 'lucide-react'
import { authClient } from '@/lib/auth-client'

type Role = 'owner' | 'customer'
type Tab =
  | 'overview'
  | 'customers'
  | 'plans'
  | 'menus'
  | 'subscriptions'
  | 'skips'
  | 'orders'
  | 'bills'
  | 'payments'
  | 'reports'
  | 'settings'
  | 'profile'
type Row = Record<string, unknown> & { _id?: string }
type Field = {
  name: string
  label: string
  type?: 'text' | 'email' | 'number' | 'date' | 'time' | 'select' | 'textarea'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
}

const today = () => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
const money = (value: unknown) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const text = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : '')
const formatDate = (value: unknown) => {
  const date = text(value)
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return date || '—'
  return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const ownerNav: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'plans', label: 'Meal plans', icon: Soup },
  { id: 'menus', label: 'Menus', icon: Utensils },
  { id: 'subscriptions', label: 'Subscriptions', icon: CalendarDays },
  { id: 'orders', label: 'Daily orders', icon: ClipboardList },
  { id: 'skips', label: 'Meal skips', icon: X },
  { id: 'bills', label: 'Bills', icon: CircleDollarSign },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'reports', label: 'Reports & analytics', icon: BarChart3 },
  { id: 'settings', label: 'Business settings', icon: Settings },
]
const customerNav: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'menus', label: 'Menu', icon: Utensils },
  { id: 'plans', label: 'Meal plans', icon: Soup },
  { id: 'subscriptions', label: 'My subscription', icon: CalendarDays },
  { id: 'skips', label: 'Skip a meal', icon: X },
  { id: 'orders', label: 'Deliveries', icon: Package },
  { id: 'bills', label: 'My bills', icon: CircleDollarSign },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'profile', label: 'My profile', icon: Settings },
]
const titles: Record<Tab, string> = {
  overview: 'Overview',
  reports: 'Reports & analytics',
  customers: 'Customers',
  plans: 'Meal plans',
  menus: 'Menus',
  subscriptions: 'Subscriptions',
  skips: 'Meal skips',
  orders: 'Daily orders',
  bills: 'Bills & invoices',
  payments: 'Payments',
  settings: 'Business settings',
  profile: 'My profile',
}
const descriptions: Partial<Record<Tab, string>> = {
  customers: 'Keep customer contacts and delivery details close at hand.',
  plans: 'Build clear meal plans and pricing for your customers.',
  menus: 'Publish what is cooking for lunch and dinner.',
  subscriptions: 'Keep track of active, paused, and pending plans.',
  skips: 'Review meal skips and cutoff eligibility.',
  orders: 'A practical list for today’s kitchen and deliveries.',
  bills: 'Transparent monthly billing, skips, and outstanding balances.',
  payments: 'Record collections and keep customer balances current.',
  reports: 'Follow monthly collections, deliveries, and meal skips.',
}

export function PlatformApp({
  role,
  userName,
  hasBusiness,
  phone,
  address,
}: {
  role: Role
  userName: string
  hasBusiness: boolean
  phone: string
  address: string
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [data, setData] = useState<Record<string, Row[]>>({})
  const [summary, setSummary] = useState<Row | null>(null)
  const [business, setBusiness] = useState<Row | null>(null)
  const [customerDirectory, setCustomerDirectory] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<Tab | 'generate-bill' | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const nav = role === 'owner' ? ownerNav : customerNav
  const activeTab = nav.some((item) => item.id === tab) ? tab : 'overview'

  const api = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, init)
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'The request could not be completed.')
    return result
  }, [])

  const loadResource = useCallback(async (resource: string) => {
    const result = await api(`/api/app?resource=${encodeURIComponent(resource)}`)
    if (resource === 'business') setBusiness(result || null)
    else if (resource === 'overview') setSummary(result)
    else if (resource === 'customers') setCustomerDirectory(result)
    else setData((current) => ({ ...current, [resource]: result }))
    return result
  }, [api])

  const refresh = useCallback(async () => {
    setError('')
    try {
      await Promise.all([loadResource('overview'), loadResource('business')])
      if (role === 'owner') {
        await Promise.all([
          loadResource('orders'),
          loadResource('subscriptions'),
          loadResource('customers'),
        ])
      } else if (hasBusiness) {
        await Promise.all([loadResource('menus'), loadResource('subscriptions')])
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to load your workspace.')
    } finally {
      setLoading(false)
    }
  }, [hasBusiness, loadResource, role])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'settings' || activeTab === 'profile') return
    const resources = activeTab === 'reports' ? ['reports', 'defaulters'] : [activeTab]
    void Promise.all(resources.map((resource) => loadResource(resource))).catch((issue) => {
      setError(issue instanceof Error ? issue.message : 'Unable to load this section.')
    })
  }, [activeTab, loadResource])

  const customerOptions = useMemo(
    () => customerDirectory.map((customer) => ({
      value: text(customer._id),
      label: `${text(customer.name)}${customer.email ? ` · ${text(customer.email)}` : ''}`,
    })).filter((option) => option.value),
    [customerDirectory],
  )
  const planOptions = useMemo(
    () => (data.plans || []).filter((plan) => plan.active !== false).map((plan) => ({
      value: text(plan._id),
      label: `${text(plan.name)} · ${money(plan.price)}${plan.billingType === 'monthly' ? '/mo' : '/meal'}`,
    })).filter((option) => option.value),
    [data.plans],
  )
  const subscriptionOptions = useMemo(
    () => (data.subscriptions || []).filter((item) => item.status === 'active').map((item) => ({
      value: text(item._id),
      label: `${text(item.planName)} · ${text(item.mealType)}`,
    })).filter((option) => option.value),
    [data.subscriptions],
  )

  const openForm = async (target: Tab | 'generate-bill', initial: Record<string, string> = {}) => {
    setError('')
    if (['subscriptions', 'payments', 'generate-bill'].includes(target)) {
      const needs = role === 'owner'
        ? ['customers', 'plans', 'subscriptions', ...(target === 'payments' ? ['bills'] : [])]
        : ['plans', 'subscriptions']
      try {
        await Promise.all(needs.map((item) => loadResource(item)))
      } catch (issue) {
        setError(issue instanceof Error ? issue.message : 'Could not load form options.')
        return
      }
    }
    setForm({ date: today(), startDate: today(), month: today().slice(0, 7), mealType: 'lunch', paymentMethod: 'UPI', billingType: 'per_meal', category: 'veg', includedMeals: '26', ...initial })
    setModal(target)
  }

  const mutate = async (resource: Tab, id: string, body: Record<string, unknown>) => {
    setBusy(true)
    setError('')
    try {
      await api('/api/app', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource, id, data: body }),
      })
      setMessage('Changes saved.')
      await Promise.all([loadResource(resource), loadResource('overview')])
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to save changes.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (resource: Tab, id: string) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return
    setBusy(true)
    setError('')
    try {
      await api('/api/app', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource, id }),
      })
      setMessage('Record deleted.')
      await loadResource(resource)
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to delete this record.')
    } finally {
      setBusy(false)
    }
  }

  const saveForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!modal) return
    setBusy(true)
    setError('')
    try {
      if (modal === 'generate-bill') {
        await api('/api/app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate-bill', ...form }),
        })
        setMessage('Monthly bill generated.')
        await Promise.all([loadResource('bills'), loadResource('overview')])
      } else if (modal === 'settings' && role === 'owner') {
        const result = await api('/api/app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource: 'business', data: form }),
        })
        setBusiness(result)
        setMessage('Business settings saved.')
      } else if (modal === 'profile') {
        await api('/api/app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update-profile', ...form }),
        })
        window.location.reload()
      } else if (modal === 'skips') {
        await api('/api/app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'skip-meal', ...form }),
        })
        setMessage('Meal skip confirmed.')
        await Promise.all([loadResource('skips'), loadResource('overview')])
      } else {
        await api('/api/app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource: modal, data: form }),
        })
        setMessage(modal === 'subscriptions' && role === 'customer' ? 'Subscription request sent.' : `${titles[modal]} saved.`)
        await Promise.all([
          loadResource(modal),
          loadResource('overview'),
          ...(modal === 'customers' ? [loadResource('customers')] : []),
        ])
      }
      setModal(null)
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to save this record.')
    } finally {
      setBusy(false)
    }
  }

  const runAction = async (action: string, payload: Record<string, unknown> = {}) => {
    setBusy(true)
    setError('')
    try {
      const result = await api('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      if (action === 'join-business') {
        setMessage(`You joined ${text(result.businessName)}.`)
        window.location.reload()
      } else if (action === 'generate-orders') {
        setMessage(`${result.created} delivery orders are ready.`)
        await Promise.all([loadResource('orders'), loadResource('overview')])
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'The action could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  const generateOrders = () => {
    void runAction('generate-orders', { date: today() })
  }

  const doSignOut = async () => {
    await authClient.signOut()
    window.location.assign('/')
  }

  const printInvoice = (bill: Row) => {
    const popup = window.open('', '_blank', 'width=800,height=900')
    if (!popup) {
      setError('Allow pop-ups to open the printable invoice.')
      return
    }
    const htmlCharacters: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }
    const safe = (value: unknown) =>
      text(value).replace(/[&<>"']/g, (character) => htmlCharacters[character] || character)
    popup.document.open()
    popup.document.write(`<!doctype html><html><head><title>TiffinTrack invoice</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>
      *{box-sizing:border-box}body{margin:0;padding:48px;color:#211b18;font:14px Arial,sans-serif}.invoice{max-width:680px;margin:auto}.brand{color:#f04424;font-weight:800;font-size:20px}.muted{color:#77716e}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #f0e5df;padding-bottom:24px}.pill{display:inline-block;background:#fff0e9;border-radius:20px;color:#bd4a2d;padding:7px 12px;font-size:11px;font-weight:bold}.amount{font-size:34px;font-weight:800;margin:10px 0}.table{margin:32px 0;border-collapse:collapse;width:100%}.table td{padding:14px 0;border-bottom:1px solid #f0e5df}.table td:last-child{text-align:right;font-weight:bold}.total{font-weight:bold;font-size:17px}.footer{margin-top:42px;padding-top:18px;border-top:1px solid #f0e5df;font-size:11px;color:#77716e}.print{margin-top:24px;border:0;border-radius:10px;background:#f04424;color:white;padding:12px 18px;font-weight:bold;cursor:pointer}@media print{body{padding:0}.print{display:none}}
      </style></head><body><main class="invoice"><div class="top"><div><div class="brand">${safe(business?.name || 'TiffinTrack')}</div><p class="muted">Monthly meal statement</p></div><div style="text-align:right"><span class="pill">${safe(text(bill.paymentStatus) || 'pending')}</span><p class="muted">Invoice period</p><strong>${safe(text(bill.billingMonth))}</strong></div></div><h1 style="margin-top:30px">Invoice</h1><p class="muted">Customer: <strong style="color:#211b18">${safe(text(bill.customerName) || userName)}</strong></p><div class="amount">${money(bill.netAmount)}</div><p class="muted">Net amount due</p><table class="table"><tr><td>Gross meal charges</td><td>${money(bill.grossAmount)}</td></tr><tr><td>Skip deductions (${safe(text(bill.skippedMeals))} meals)</td><td>−${money(bill.skipDeduction)}</td></tr><tr><td>Advance adjustment</td><td>−${money(bill.advanceAdjustment)}</td></tr><tr><td>Paid so far</td><td>−${money(bill.paidAmount)}</td></tr><tr class="total"><td>Balance due</td><td>${money(Number(bill.netAmount) - Number(bill.paidAmount || 0))}</td></tr></table><p class="muted">Meals delivered: ${safe(text(bill.deliveredMeals))} · Skips recorded: ${safe(text(bill.skippedMeals))}</p><div class="footer">Thank you for being part of our tiffin service. This invoice was generated by TiffinTrack.</div><button class="print" onclick="window.print()">Print / Save as PDF</button></main></body></html>`)
    popup.document.close()
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#fff9f5] text-sm font-semibold text-muted-foreground"><LoaderCircle className="mr-2 animate-spin text-primary" size={18} /> Getting your workspace ready…</div>
  }

  if (role === 'customer' && !hasBusiness) {
    return <JoinBusiness name={userName} busy={busy} error={error} onJoin={(code) => runAction('join-business', { code })} onSignOut={doSignOut} />
  }

  const pageData = activeTab === 'customers' ? customerDirectory : data[activeTab] || []
  const createLabel: Partial<Record<Tab, string>> = {
    customers: 'Add customer',
    plans: role === 'owner' ? 'Create meal plan' : 'Choose this plan',
    menus: 'Publish menu',
    subscriptions: role === 'owner' ? 'Add subscription' : 'Request a subscription',
    skips: 'Skip a meal',
    payments: 'Record payment',
  }

  return (
    <main className="min-h-screen bg-[#fff9f5] text-[#171717]">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-[258px] shrink-0 flex-col border-r border-[#f0e5df] bg-[#fffdfb] px-5 py-7 lg:flex">
          <Brand />
          <p className="mb-3 mt-10 px-3 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#aaa09a]">{role === 'owner' ? 'Owner workspace' : 'My tiffin service'}</p>
          <nav className="flex flex-col gap-1" aria-label="Workspace navigation">
            {nav.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={`app-nav-link ${activeTab === id ? 'app-nav-link-active' : ''}`} aria-current={activeTab === id ? 'page' : undefined}>
                <Icon size={18} strokeWidth={1.8} />{label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl bg-[#fff1e9] p-4">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white text-primary shadow-sm"><Sparkles size={17} /></span>
            <p className="mt-3 text-sm font-extrabold">A smoother kind of service.</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{role === 'owner' ? 'Your customers, daily orders, and payments all together.' : 'Your menu, meals, and account details all in one place.'}</p>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-[#f0e5df] pt-5">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#ffe5d8] text-sm font-extrabold text-[#9d482e]">{userName.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{userName}</p><p className="text-xs capitalize text-muted-foreground">{role} account</p></div>
            <button onClick={doSignOut} className="text-muted-foreground hover:text-primary" aria-label="Sign out"><LogOut size={17} /></button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#f0e5df] bg-[#fff9f5]/95 px-5 backdrop-blur-md md:px-8">
            <div className="flex items-center gap-3 lg:hidden"><Brand /></div>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
              <span>{role === 'owner' ? text(business?.name) || 'Your service' : text(business?.name) || 'My tiffin service'}</span><ChevronRight size={14} /><span className="font-bold text-foreground">{titles[activeTab]}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs font-medium text-muted-foreground sm:inline">{new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span className="flex size-9 items-center justify-center rounded-full bg-[#ffe5d8] text-xs font-extrabold text-[#9d482e] lg:hidden">{userName.slice(0, 1).toUpperCase()}</span>
              <button onClick={doSignOut} className="rounded-lg p-2 text-muted-foreground hover:bg-[#fff0e9] hover:text-primary lg:hidden" aria-label="Sign out"><LogOut size={17} /></button>
              <button className="hidden rounded-lg p-2 text-muted-foreground hover:bg-[#fff0e9] hover:text-primary lg:flex" onClick={doSignOut} aria-label="Sign out"><LogOut size={18} /></button>
            </div>
          </header>
          <nav className="flex gap-1 overflow-x-auto border-b border-[#f0e5df] bg-white px-3 py-2 lg:hidden" aria-label="Mobile workspace navigation">
            {nav.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${activeTab === id ? 'bg-[#fff0e9] text-primary' : 'text-muted-foreground hover:bg-[#fff9f5]'}`} aria-current={activeTab === id ? 'page' : undefined}>
                <Icon size={15} />{label}
              </button>
            ))}
          </nav>

          <div className="mx-auto w-full max-w-[1280px] flex-1 px-5 py-7 md:px-8 md:py-9 lg:px-10 lg:py-10">
            {message && <div className="mb-5 flex items-center justify-between rounded-xl border border-[#dce7cf] bg-[#f3f7ed] px-4 py-3 text-sm font-semibold text-[#566b3e]" role="status"><span className="flex items-center gap-2"><CheckCircle2 size={17} />{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss message"><X size={16} /></button></div>}
            {error && <div className="mb-5 flex items-center justify-between rounded-xl border border-[#f2d4cb] bg-[#fff3ef] px-4 py-3 text-sm font-semibold text-[#a33c2c]" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}

            {activeTab === 'overview' && (
              <Overview
                role={role}
                name={userName}
                business={business}
                summary={summary}
                orders={data.orders || []}
                subscriptions={data.subscriptions || []}
                menus={data.menus || []}
                busy={busy}
                go={setTab}
                add={(target) => void openForm(target)}
                generateOrders={generateOrders}
                onStatus={(resource, id, value) => void mutate(resource, id, { status: value })}
              />
            )}
            {activeTab === 'settings' && role === 'owner' && (
              <SettingsPage
                business={business}
                inviteCode={text(business?.inviteCode)}
                onEdit={() => void openForm('settings', {
                  name: text(business?.name),
                  lunchCutoff: text(business?.lunchCutoff) || '10:00',
                  dinnerCutoff: text(business?.dinnerCutoff) || '17:00',
                })}
              />
            )}
            {activeTab === 'profile' && role === 'customer' && (
              <ProfilePage name={userName} phone={phone} address={address} onEdit={() => void openForm('profile', { name: userName, phone, address })} />
            )}
            {activeTab === 'reports' && role === 'owner' && <ReportsPage rows={data.reports || []} defaulters={data.defaulters || []} />}
            {!['overview', 'settings', 'profile', 'reports'].includes(activeTab) && (
              <ResourcePage
                role={role}
                tab={activeTab}
                rows={pageData}
                busy={busy}
                createLabel={createLabel[activeTab]}
                onCreate={() => {
                  if (activeTab === 'plans' && role === 'customer') {
                    void openForm('subscriptions', { planId: '' })
                  } else {
                    void openForm(activeTab)
                  }
                }}
                onCreateWith={(initial) => void openForm(initial.subscriptionId ? 'generate-bill' : 'subscriptions', initial)}
                onGenerateOrders={activeTab === 'orders' && role === 'owner' ? generateOrders : undefined}
                onGenerateBill={activeTab === 'bills' && role === 'owner' ? () => void openForm('generate-bill') : undefined}
                onStatus={(resource, id, value) => void mutate(resource, id, { status: value })}
                onPlanActive={(id, value) => void mutate('plans', id, { active: value })}
                onDelete={(resource, id) => void remove(resource, id)}
                onPrintBill={printInvoice}
              />
            )}
          </div>
        </section>
      </div>

      {modal && (
        <FormModal
          title={modal === 'generate-bill' ? 'Generate a monthly bill' : modal === 'settings' ? 'Business settings' : modal === 'profile' ? 'Update your profile' : createLabel[modal] || `Add ${titles[modal].toLowerCase()}`}
          fields={fieldsFor(modal, role, customerOptions, planOptions, subscriptionOptions, data.bills || [])}
          values={form}
          busy={busy}
          onChange={(name, value) => setForm((current) => ({ ...current, [name]: value }))}
          onClose={() => setModal(null)}
          onSubmit={saveForm}
        />
      )}
    </main>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-[14px] bg-[#f04424] text-white shadow-[0_8px_18px_rgba(240,68,36,0.2)]"><Soup size={21} /></span>
      <span className="text-[16px] font-extrabold tracking-[-0.05em]">Tiffin<span className="text-[#f04424]">Track</span></span>
    </div>
  )
}

function Overview({
  role,
  name,
  business,
  summary,
  orders,
  subscriptions,
  menus,
  busy,
  go,
  add,
  generateOrders,
  onStatus,
}: {
  role: Role
  name: string
  business: Row | null
  summary: Row | null
  orders: Row[]
  subscriptions: Row[]
  menus: Row[]
  busy: boolean
  go: (tab: Tab) => void
  add: (tab: Tab) => void
  generateOrders: () => void
  onStatus: (resource: Tab, id: string, value: string) => void
}) {
  const counts = (summary?.counts || {}) as Row
  const todayOrders = orders.filter((order) => order.date === summary?.date)
  const menuToday = menus.filter((menu) => menu.date === summary?.date)
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === 'active')
  const ownerStats = [
    { icon: Users, label: 'Customers', value: text(counts.customers) || '0', detail: 'in your service', color: 'orange' },
    { icon: CalendarDays, label: 'Active subscriptions', value: text(counts.activeSubscriptions) || '0', detail: 'meal plans underway', color: 'peach' },
    { icon: ClipboardList, label: 'Today’s orders', value: text(counts.todayOrders) || '0', detail: `${text(counts.pendingDeliveries) || '0'} awaiting delivery`, color: 'green' },
    { icon: Wallet, label: 'Collected this month', value: money(counts.monthlyRevenue), detail: `${money(counts.pendingAmount)} still outstanding`, color: 'orange' },
  ] as const
  const customerStats = [
    { icon: Soup, label: 'Active meal plans', value: String(activeSubscriptions.length), detail: 'your subscriptions', color: 'orange' },
    { icon: Package, label: 'Deliveries today', value: String(todayOrders.length), detail: `${todayOrders.filter((order) => order.status === 'delivered').length} delivered`, color: 'peach' },
    { icon: CircleDollarSign, label: 'Outstanding', value: money(counts.pendingAmount), detail: 'remaining on your bills', color: 'green' },
    { icon: CreditCard, label: 'Paid this month', value: money(counts.monthlyRevenue), detail: 'recorded payments', color: 'orange' },
  ] as const
  const stats = role === 'owner' ? ownerStats : customerStats

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f2ded4] bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#a44e36]"><span className="size-1.5 rounded-full bg-[#ef7758]" />{role === 'owner' ? 'Owner workspace' : text(business?.name) || 'Customer workspace'}</span>
          <h1 className="text-[2rem] font-extrabold leading-tight tracking-[-0.055em] md:text-[2.6rem]">Hello, {name.split(' ')[0]}<span className="text-primary">.</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">{role === 'owner' ? 'Here’s what’s happening with your service today.' : 'Here’s a fresh look at your tiffin routine.'}</p>
        </div>
        {role === 'owner' ? (
          <button onClick={generateOrders} disabled={busy} className="primary-small"><ClipboardList size={16} /> Generate today&apos;s orders</button>
        ) : (
          <button onClick={() => go('menus')} className="primary-small"><Utensils size={16} /> Today&apos;s menu</button>
        )}
      </div>

      <section className="relative mb-5 overflow-hidden rounded-[26px] bg-[#f04424] p-6 text-white shadow-[0_16px_38px_rgba(192,64,37,0.16)] md:p-8">
        <span className="pointer-events-none absolute -right-10 -top-32 size-72 rounded-full border border-white/10" />
        <span className="pointer-events-none absolute -right-20 -bottom-48 size-80 rounded-full bg-[#ff8867]/30" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-[620px]"><p className="flex items-center gap-2 text-xs font-bold text-white/75"><Sparkles size={14} />{role === 'owner' ? 'YOUR SERVICE, AT A GLANCE' : 'A LITTLE MORE PEACE OF MIND'}</p><h2 className="mt-3 text-2xl font-extrabold tracking-[-0.04em] md:text-[1.8rem]">{role === 'owner' ? 'A smoother service starts with a clear picture.' : 'Good meals, without the guesswork.'}</h2><p className="mt-2 text-sm leading-6 text-white/75">{role === 'owner' ? 'Your daily preparation, customer activity, and payments are right here when you need them.' : 'Check the menu, manage your plan, and keep up with your deliveries and bills.'}</p></div>
          <div className="hidden size-20 items-center justify-center rounded-[25px] border border-white/20 bg-white/10 sm:flex"><Soup size={38} strokeWidth={1.4} /></div>
        </div>
        <div className="relative z-10 mt-6 flex flex-wrap gap-2 border-t border-white/20 pt-4">
          {(role === 'owner'
            ? [{ label: 'Add customer', tab: 'customers' as const }, { label: 'Publish menu', tab: 'menus' as const }, { label: 'Record payment', tab: 'payments' as const }]
            : [{ label: 'Browse plans', tab: 'plans' as const }, { label: 'Skip a meal', tab: 'skips' as const }, { label: 'View my bills', tab: 'bills' as const }]
          ).map((item) => <button key={item.label} onClick={() => item.tab === 'customers' || item.tab === 'menus' || item.tab === 'payments' || item.tab === 'skips' ? add(item.tab) : go(item.tab)} className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold transition hover:bg-white/20">{item.label} <ArrowRight size={13} className="ml-1 inline" /></button>)}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, detail, color }) => (
          <div key={label} className="rounded-2xl border border-[#f0e5df] bg-white p-4 shadow-[0_6px_20px_rgba(52,31,20,0.035)] md:p-5">
            <div className="flex items-center justify-between"><p className="text-xs font-bold text-muted-foreground">{label}</p><span className={`flex size-9 items-center justify-center rounded-xl ${color === 'green' ? 'bg-[#f1f3eb] text-[#697b4f]' : color === 'peach' ? 'bg-[#fff3e8] text-[#b46b38]' : 'bg-[#fff0e9] text-primary'}`}><Icon size={17} /></span></div>
            <p className="mt-4 text-[1.65rem] font-extrabold tracking-[-0.045em]">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-7 xl:grid-cols-[1.12fr_0.88fr]">
        <section>
          <div className="mb-4 flex items-end justify-between gap-2"><div><h2 className="text-lg font-extrabold tracking-tight">{role === 'owner' ? 'Today’s delivery list' : 'Your upcoming deliveries'}</h2><p className="mt-1 text-xs text-muted-foreground">{formatDate(summary?.date)}</p></div><button onClick={() => go('orders')} className="text-xs font-extrabold text-primary hover:underline">View all</button></div>
          {!todayOrders.length ? (
            <div className="rounded-2xl border border-dashed border-[#e9d8ce] bg-white px-5 py-8 text-center"><div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-[#fff0e9] text-primary"><ClipboardList size={19} /></div><p className="mt-3 text-sm font-bold">{role === 'owner' ? 'No orders generated for today' : 'No delivery scheduled today'}</p><p className="mt-1 text-xs text-muted-foreground">{role === 'owner' ? 'Generate orders to prepare your delivery list.' : 'Your upcoming deliveries will appear here.'}</p>{role === 'owner' && <button className="mt-4 text-xs font-bold text-primary" onClick={generateOrders}>Generate today&apos;s orders <ArrowRight size={13} className="ml-1 inline" /></button>}</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#f0e5df] bg-white">
              {todayOrders.slice(0, 6).map((order) => <div key={text(order._id)} className="flex items-center gap-3 border-b border-[#f3ece7] px-4 py-3.5 last:border-0"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff0e9] text-primary"><Soup size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">{text(order.customerName) || 'Your tiffin'} · <span className="capitalize">{text(order.mealType)}</span></p><p className="mt-1 truncate text-[10px] text-muted-foreground">{text(order.deliveryAddress) || text(order.menuItems)}</p></div><Status value={text(order.status)} />{role === 'owner' && order.status === 'pending' && <button disabled={busy} onClick={() => onStatus('orders', text(order._id), 'delivered')} className="rounded-lg bg-[#f1f3eb] p-2 text-[#697b4f] hover:bg-[#e7eddc]" aria-label="Mark delivered"><Check size={15} /></button>}</div>)}
            </div>
          )}
        </section>
        <section>
          <div className="mb-4 flex items-end justify-between gap-2"><div><h2 className="text-lg font-extrabold tracking-tight">{role === 'owner' ? 'The menu today' : 'Today’s menu'}</h2><p className="mt-1 text-xs text-muted-foreground">A taste of what&apos;s cooking.</p></div><button onClick={() => go('menus')} className="text-xs font-extrabold text-primary hover:underline">Browse menu</button></div>
          {!menuToday.length ? (
            <div className="rounded-2xl border border-[#f0e5df] bg-white p-5"><p className="text-sm font-bold">Today&apos;s menu is on its way.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{role === 'owner' ? 'Publish today’s lunch and dinner menu to share it with customers.' : 'Check back soon for the day’s lunch and dinner.'}</p>{role === 'owner' && <button className="mt-3 text-xs font-bold text-primary" onClick={() => add('menus')}>Publish a menu <ArrowRight size={13} className="ml-1 inline" /></button>}</div>
          ) : menuToday.map((menu) => <div key={text(menu._id)} className="mb-2 rounded-2xl border border-[#f0e5df] bg-white p-4"><div className="flex items-center justify-between"><span className="text-xs font-extrabold capitalize">{text(menu.mealType)}</span><span className="rounded-full bg-[#f1f3eb] px-2.5 py-1 text-[9px] font-bold text-[#697b4f]">{text(menu.category) || 'veg'}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{Array.isArray(menu.items) ? menu.items.join(' · ') : text(menu.items)}</p></div>)}
        </section>
      </div>

      {role === 'customer' && !activeSubscriptions.length && (
        <section className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#f0e5df] bg-white p-5"><div><h2 className="text-sm font-extrabold">Ready to make it official?</h2><p className="mt-1 text-xs text-muted-foreground">Pick a meal plan that fits your everyday.</p></div><button className="primary-small" onClick={() => go('plans')}>Explore meal plans <ArrowRight size={15} /></button></section>
      )}
    </div>
  )
}

function ResourcePage({
  role,
  tab,
  rows,
  busy,
  createLabel,
  onCreate,
  onCreateWith,
  onGenerateOrders,
  onGenerateBill,
  onStatus,
  onPlanActive,
  onDelete,
  onPrintBill,
}: {
  role: Role
  tab: Tab
  rows: Row[]
  busy: boolean
  createLabel?: string
  onCreate: () => void
  onCreateWith: (initial: Record<string, string>) => void
  onGenerateOrders?: () => void
  onGenerateBill?: () => void
  onStatus: (resource: Tab, id: string, value: string) => void
  onPlanActive: (id: string, value: boolean) => void
  onDelete: (resource: Tab, id: string) => void
  onPrintBill: (row: Row) => void
}) {
  const todayOrders = tab === 'orders' ? rows.filter((order) => order.date === today()) : []
  const pageRows = tab === 'orders' && role === 'owner' ? todayOrders : rows
  const canCreate = Boolean(createLabel) &&
    (tab !== 'menus' || role === 'owner') &&
    (tab !== 'skips' || role === 'customer') &&
    (tab !== 'plans' || role === 'owner')

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary">{role === 'owner' ? 'Service management' : 'Your tiffin service'}</p><h1 className="text-3xl font-extrabold tracking-[-0.05em] md:text-4xl">{titles[tab]}</h1><p className="mt-2 text-sm text-muted-foreground">{descriptions[tab] || 'Your tiffin details, organized for you.'}</p></div>
        <div className="flex flex-wrap gap-2">
          {onGenerateOrders && <button disabled={busy} className="secondary-action" onClick={onGenerateOrders}><ClipboardList size={16} /> Generate today</button>}
          {onGenerateBill && <button className="secondary-action" onClick={onGenerateBill}><CircleDollarSign size={16} /> Generate bill</button>}
          {canCreate && <button className="primary-small" onClick={onCreate}><Plus size={16} /> {createLabel}</button>}
        </div>
      </div>

      {tab === 'plans' && role === 'customer' && (
        <div className="mb-5 rounded-xl border border-[#f2dfd4] bg-[#fff3ec] px-4 py-3 text-xs leading-5 text-[#785344]">Your subscription request is sent to the service owner for confirmation. Billing terms and delivery details are shown on each plan.</div>
      )}
      {tab === 'skips' && role === 'customer' && (
        <div className="mb-5 rounded-xl border border-[#f2dfd4] bg-[#fff3ec] px-4 py-3 text-xs leading-5 text-[#785344]">Same-day skips must be requested before your provider&apos;s meal cutoff. Future meal skips can be made in advance.</div>
      )}
      {tab === 'orders' && role === 'owner' && (
        <div className="mb-5 rounded-xl border border-[#f0e5df] bg-white px-4 py-3 text-xs text-muted-foreground">Showing today&apos;s orders. Generating again is safe and will not create duplicate deliveries.</div>
      )}

      {!pageRows.length ? (
        <div className="rounded-[22px] border border-dashed border-[#e9d8ce] bg-white px-6 py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#fff0e9] text-primary"><PageIcon tab={tab} /></span>
          <h2 className="mt-4 text-sm font-extrabold">{emptyTitle(tab, role)}</h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">{emptyDescription(tab, role)}</p>
          {canCreate && <button onClick={onCreate} className="primary-small mx-auto mt-5"><Plus size={15} /> {createLabel}</button>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-[#f0e5df] bg-white shadow-[0_6px_22px_rgba(52,31,20,0.035)]">
          <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_auto] border-b border-[#f0e5df] bg-[#fffaf7] px-5 py-3 text-[9px] font-extrabold uppercase tracking-[0.13em] text-muted-foreground md:grid">
            <span>{tab === 'menus' ? 'Date & meal' : tab === 'orders' ? 'Customer & delivery' : tab === 'customers' ? 'Customer' : tab === 'plans' ? 'Plan' : tab === 'bills' ? 'Billing period' : tab === 'payments' ? 'Payment date' : 'Details'}</span><span>{tab === 'menus' ? 'Menu' : tab === 'orders' ? 'Meal' : tab === 'plans' ? 'Billing' : tab === 'bills' ? 'Summary' : 'Status / details'}</span><span>Amount / address</span><span className="text-right">Actions</span>
          </div>
          {pageRows.map((row) => {
            const id = text(row._id)
            return (
              <div key={id} className="flex flex-wrap items-center gap-3 border-b border-[#f3ece7] px-4 py-4 last:border-0 sm:px-5">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tab === 'payments' || tab === 'bills' ? 'bg-[#f1f3eb] text-[#697b4f]' : 'bg-[#fff0e9] text-primary'}`}><PageIcon tab={tab} /></span>
                <div className="min-w-0 flex-1 md:grid md:grid-cols-[1.4fr_1fr_0.8fr] md:items-center md:gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold">{primaryText(tab, row)}</p>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">{secondaryText(tab, row)}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 md:mt-0">
                    {statusOf(tab, row) && <Status value={statusOf(tab, row)} />}
                    <p className="truncate text-[10px] text-muted-foreground md:hidden">{tertiaryText(tab, row)}</p>
                    {tab === 'menus' && <span className="truncate text-[10px] text-muted-foreground">{Array.isArray(row.items) ? row.items.join(' · ') : ''}</span>}
                    {tab === 'orders' && <span className="hidden text-[10px] text-muted-foreground md:block">{text(row.mealType)}</span>}
                    {tab === 'subscriptions' && <span className="text-[10px] capitalize text-muted-foreground">{text(row.mealType)}</span>}
                    {tab === 'skips' && <span className="text-[10px] capitalize text-muted-foreground">{text(row.mealType)}</span>}
                    {tab === 'bills' && <span className="hidden text-[10px] text-muted-foreground md:block">{`${text(row.deliveredMeals)} delivered · ${text(row.skippedMeals)} skipped`}</span>}
                    {tab === 'plans' && <span className="hidden text-[10px] text-muted-foreground md:block">{text(row.description)}</span>}
                  </div>
                  <div className="hidden min-w-0 md:block"><p className="truncate text-xs font-bold">{amountText(tab, row)}</p><p className="mt-1 truncate text-[10px] text-muted-foreground">{tertiaryText(tab, row)}</p></div>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  {tab === 'plans' && role === 'customer' && <button onClick={() => onCreateWith({ planId: id })} className="rounded-lg bg-primary px-3 py-2 text-[10px] font-bold text-white hover:bg-[#d9381b]">Subscribe</button>}
                  {tab === 'bills' && <button onClick={() => onPrintBill(row)} className="rounded-lg border border-[#eadbd3] px-2.5 py-2 text-[10px] font-bold hover:border-[#f0b5a2] hover:text-primary"><Download size={13} className="mr-1 inline" /> Invoice</button>}
                  {tab === 'orders' && role === 'owner' && row.status === 'pending' && <button disabled={busy} onClick={() => onStatus('orders', id, 'delivered')} className="rounded-lg bg-[#f1f3eb] px-2.5 py-2 text-[10px] font-bold text-[#63764b] hover:bg-[#e7eddc]"><Check size={14} className="inline" /> Delivered</button>}
                  {tab === 'subscriptions' && row.status === 'pending' && role === 'owner' && <button onClick={() => onStatus('subscriptions', id, 'active')} className="rounded-lg bg-[#f1f3eb] px-2.5 py-2 text-[10px] font-bold text-[#63764b]">Approve</button>}
                  {tab === 'subscriptions' && role === 'owner' && row.status === 'active' && <button onClick={() => onStatus('subscriptions', id, 'paused')} className="rounded-lg bg-[#fff4e7] px-2.5 py-2 text-[10px] font-bold text-[#9d6a2c]">Pause</button>}
                  {tab === 'subscriptions' && role === 'owner' && row.status === 'paused' && <button onClick={() => onStatus('subscriptions', id, 'active')} className="rounded-lg bg-[#f1f3eb] px-2.5 py-2 text-[10px] font-bold text-[#63764b]">Resume</button>}
                  {tab === 'subscriptions' && role === 'customer' && row.status === 'active' && <button onClick={() => onStatus('subscriptions', id, 'paused')} className="rounded-lg bg-[#fff4e7] px-2.5 py-2 text-[10px] font-bold text-[#9d6a2c]">Pause</button>}
                  {tab === 'subscriptions' && role === 'customer' && row.status === 'paused' && <button onClick={() => onStatus('subscriptions', id, 'active')} className="rounded-lg bg-[#f1f3eb] px-2.5 py-2 text-[10px] font-bold text-[#63764b]">Resume</button>}
                  {tab === 'subscriptions' && role === 'customer' && ['active', 'paused'].includes(text(row.status)) && <button onClick={() => onStatus('subscriptions', id, 'cancelled')} className="rounded-lg px-2 py-2 text-[10px] font-bold text-destructive hover:bg-red-50">Cancel</button>}
                  {tab === 'subscriptions' && role === 'owner' && ['active', 'paused'].includes(text(row.status)) && <button onClick={() => onStatus('subscriptions', id, 'cancelled')} className="rounded-lg px-2 py-2 text-[10px] font-bold text-destructive hover:bg-red-50">Cancel</button>}
                  {tab === 'subscriptions' && role === 'owner' && row.status === 'active' && <button onClick={() => onCreateWith({ customerId: text(row.customerId), subscriptionId: id })} className="rounded-lg border border-[#eadbd3] px-2.5 py-2 text-[10px] font-bold hover:border-[#f0b5a2] hover:text-primary">Bill</button>}
                  {tab === 'plans' && role === 'owner' && <button onClick={() => onPlanActive(id, row.active === false)} className="rounded-lg px-2.5 py-2 text-[10px] font-bold text-primary hover:bg-[#fff0e9]">{row.active === false ? 'Activate' : 'Deactivate'}</button>}
                  {tab === 'skips' && role === 'owner' && row.status === 'approved' && <span className="px-2 text-[10px] font-semibold text-[#697b4f]">Confirmed</span>}
                  {tab === 'customers' && role === 'owner' && <span className="px-2 text-[10px] font-semibold text-muted-foreground">{row.linked ? 'Joined' : 'Not joined'}</span>}
                  {['menus', 'plans', 'customers', 'payments'].includes(tab) && role === 'owner' && <button onClick={() => onDelete(tab, id)} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-destructive" aria-label={`Delete ${primaryText(tab, row)}`}><Trash2 size={15} /></button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PageIcon({ tab }: { tab: Tab }) {
  const icons: Partial<Record<Tab, typeof Home>> = {
    customers: Users,
    plans: Soup,
    menus: Utensils,
    subscriptions: CalendarDays,
    skips: X,
    orders: ClipboardList,
    bills: CircleDollarSign,
    payments: CreditCard,
  }
  const Icon = icons[tab] || Package
  return <Icon size={18} />
}

function primaryText(tab: Tab, row: Row) {
  if (tab === 'customers') return text(row.name) || 'Customer'
  if (tab === 'plans') return text(row.name) || 'Meal plan'
  if (tab === 'menus') return `${formatDate(row.date)} · ${text(row.mealType)}`
  if (tab === 'subscriptions') return `${text(row.customerName) || 'Customer'} · ${text(row.planName)}`
  if (tab === 'skips') return `${text(row.customerName) || 'Meal skip'} · ${formatDate(row.date)}`
  if (tab === 'orders') return `${text(row.customerName) || 'Customer'} · ${formatDate(row.date)}`
  if (tab === 'bills') return `${text(row.customerName) || 'Customer'} · ${text(row.billingMonth)}`
  if (tab === 'payments') return `${text(row.customerName) || 'Payment'} · ${text(row.note) || formatDate(row.date)}`
  return titles[tab]
}
function secondaryText(tab: Tab, row: Row) {
  if (tab === 'customers') return text(row.email) || text(row.phone)
  if (tab === 'plans') return text(row.description) || `${text(row.mealType)} plan`
  if (tab === 'menus') return `${text(row.category) || 'veg'} · ${Array.isArray(row.items) ? row.items.join(', ') : ''}`
  if (tab === 'subscriptions') return `Started ${formatDate(row.startDate)}${row.deliveryAddress ? ` · ${text(row.deliveryAddress)}` : ''}`
  if (tab === 'skips') return `Meal · ${text(row.mealType)}`
  if (tab === 'orders') return text(row.deliveryAddress) || text(row.customerEmail)
  if (tab === 'bills') return `${text(row.deliveredMeals)} meals delivered · ${text(row.skippedMeals)} skips`
  if (tab === 'payments') return `${text(row.paymentMethod) || 'Payment'} · ${formatDate(row.date)}`
  return ''
}
function tertiaryText(tab: Tab, row: Row) {
  if (tab === 'customers') return text(row.address) || (row.linked ? 'Account connected' : 'Share your business invite code')
  if (tab === 'plans') return `${text(row.mealType)} · ${row.billingType === 'monthly' ? 'monthly plan' : 'per meal'}`
  if (tab === 'menus') return text(row.imageUrl)
  if (tab === 'subscriptions') return text(row.deliveryAddress) || 'Delivery address not set'
  if (tab === 'orders') return text(row.deliveryAddress) || 'Address not set'
  if (tab === 'bills') return `${text(row.paymentStatus)} · ${money(row.paidAmount)} paid`
  if (tab === 'payments') return text(row.note)
  return ''
}
function amountText(tab: Tab, row: Row) {
  if (tab === 'plans') return `${money(row.price)}${row.billingType === 'monthly' ? ' / month' : ' / meal'}`
  if (tab === 'bills') return `${money(row.netAmount)} due`
  if (tab === 'payments') return money(row.amount)
  if (tab === 'orders') return money(row.amount)
  return ''
}
function statusOf(tab: Tab, row: Row) {
  if (['orders', 'subscriptions', 'skips', 'bills'].includes(tab)) return text(tab === 'bills' ? row.paymentStatus : row.status)
  if (tab === 'plans') return row.active === false ? 'inactive' : 'active'
  return ''
}

function Status({ value }: { value: string }) {
  const tone = ['delivered', 'active', 'approved', 'paid'].includes(value)
    ? 'bg-[#f0f4e9] text-[#62764a]'
    : ['pending', 'partial', 'paused'].includes(value)
      ? 'bg-[#fff4e7] text-[#a36b2e]'
      : 'bg-[#f4efec] text-[#776c65]'
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[9px] font-extrabold capitalize ${tone}`}>{value || '—'}</span>
}

function emptyTitle(tab: Tab, role: Role) {
  const values: Partial<Record<Tab, string>> = {
    customers: 'Your customer list is ready when you are',
    plans: role === 'owner' ? 'Start with your first meal plan' : 'No meal plans are available yet',
    menus: role === 'owner' ? 'No menus published yet' : 'The menu is being prepared',
    subscriptions: 'No subscriptions here yet',
    skips: 'No meal skips recorded',
    orders: role === 'owner' ? 'No orders for today' : 'No deliveries to show',
    bills: 'No bills have been generated yet',
    payments: 'No payment records yet',
  }
  return values[tab] || 'Nothing to show just yet'
}
function emptyDescription(tab: Tab, role: Role) {
  const values: Partial<Record<Tab, string>> = {
    customers: 'Add your first customer and keep their contact and delivery details together.',
    plans: role === 'owner' ? 'Add lunch, dinner, or monthly plans to share with your customers.' : 'Your service owner will publish available plans here.',
    menus: role === 'owner' ? 'Publish a dated lunch or dinner menu to help everyone plan ahead.' : 'Your service owner has not published a menu for this date.',
    subscriptions: 'Your active and past meal subscriptions will appear here.',
    skips: role === 'owner' ? 'Customer skip requests will appear here for review.' : 'When you skip a meal before cutoff, it will show up here.',
    orders: role === 'owner' ? 'Generate the day’s orders from active subscriptions to prepare your delivery list.' : 'Your upcoming and completed tiffin deliveries will appear here.',
    bills: 'Generated monthly bills, skip deductions, and payment status will show here.',
    payments: 'Payments recorded by your tiffin service will show here.',
  }
  return values[tab] || 'Try again after your service has added records.'
}

function fieldsFor(
  tab: Tab | 'generate-bill',
  role: Role,
  customers: Field['options'] = [],
  plans: Field['options'] = [],
  subscriptions: Field['options'] = [],
  bills: Row[] = [],
): Field[] {
  if (tab === 'customers') return [
    { name: 'name', label: 'Customer name', required: true, placeholder: 'Full name' },
    { name: 'email', label: 'Email address', type: 'email', required: true, placeholder: 'customer@example.com' },
    { name: 'phone', label: 'Phone number', placeholder: 'Optional' },
    { name: 'address', label: 'Delivery address', type: 'textarea', placeholder: 'Area, street, and delivery notes' },
  ]
  if (tab === 'plans') return [
    { name: 'name', label: 'Plan name', required: true, placeholder: 'Everyday lunch' },
    { name: 'description', label: 'Description', placeholder: 'What’s included?' },
    { name: 'mealType', label: 'Meals included', type: 'select', required: true, options: [{ value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }, { value: 'both', label: 'Lunch & dinner' }] },
    { name: 'billingType', label: 'Billing style', type: 'select', required: true, options: [{ value: 'per_meal', label: 'Pay per delivered meal' }, { value: 'monthly', label: 'Monthly subscription' }] },
    { name: 'price', label: 'Price (₹)', type: 'number', required: true, placeholder: '100' },
    { name: 'includedMeals', label: 'Meals included per month', type: 'number', required: true, placeholder: '26' },
  ]
  if (tab === 'menus') return [
    { name: 'date', label: 'Menu date', type: 'date', required: true },
    { name: 'mealType', label: 'Meal', type: 'select', required: true, options: [{ value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }] },
    { name: 'category', label: 'Food type', type: 'select', options: [{ value: 'veg', label: 'Vegetarian' }, { value: 'non-veg', label: 'Non-vegetarian' }] },
    { name: 'items', label: 'Menu items', type: 'textarea', required: true, placeholder: 'Dal, rice, roti, seasonal sabzi' },
    { name: 'imageUrl', label: 'Menu photo URL', placeholder: 'Optional image link' },
  ]
  if (tab === 'subscriptions') return role === 'owner' ? [
    { name: 'customerId', label: 'Customer', type: 'select', required: true, options: customers },
    { name: 'planId', label: 'Meal plan', type: 'select', required: true, options: plans },
    { name: 'startDate', label: 'Start date', type: 'date', required: true },
    { name: 'deliveryAddress', label: 'Delivery address', type: 'textarea', placeholder: 'Leave blank to use customer address' },
  ] : [
    { name: 'planId', label: 'Meal plan', type: 'select', required: true, options: plans },
    { name: 'startDate', label: 'Preferred start date', type: 'date', required: true },
    { name: 'deliveryAddress', label: 'Delivery address', type: 'textarea', required: true, placeholder: 'Where should we deliver?' },
  ]
  if (tab === 'skips') return [
    { name: 'subscriptionId', label: 'Subscription', type: 'select', required: true, options: subscriptions },
    { name: 'date', label: 'Meal date', type: 'date', required: true },
    { name: 'mealType', label: 'Meal to skip', type: 'select', required: true, options: [{ value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }] },
  ]
  if (tab === 'payments') return [
    { name: 'customerId', label: 'Customer', type: 'select', required: true, options: customers },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, placeholder: '1000' },
    { name: 'billId', label: 'Apply to bill', type: 'select', options: [{ value: '', label: 'General advance' }, ...bills.filter((bill) => bill.paymentStatus !== 'paid').map((bill) => ({ value: text(bill._id), label: `${text(bill.billingMonth)} · ${money(Number(bill.netAmount) - Number(bill.paidAmount || 0))} due` }))] },
    { name: 'date', label: 'Payment date', type: 'date', required: true },
    { name: 'paymentMethod', label: 'Payment method', type: 'select', options: [{ value: 'UPI', label: 'UPI' }, { value: 'Cash', label: 'Cash' }, { value: 'Bank transfer', label: 'Bank transfer' }, { value: 'Other', label: 'Other' }] },
    { name: 'note', label: 'Note', placeholder: 'Optional' },
  ]
  if (tab === 'generate-bill') return [
    { name: 'customerId', label: 'Customer', type: 'select', required: true, options: customers },
    { name: 'subscriptionId', label: 'Subscription', type: 'select', required: true, options: subscriptions },
    { name: 'month', label: 'Billing month', type: 'text', required: true, placeholder: 'YYYY-MM' },
  ]
  if (tab === 'settings') return [
    { name: 'name', label: 'Tiffin service name', required: true, placeholder: 'Your business name' },
    { name: 'lunchCutoff', label: 'Lunch skip cutoff', type: 'time', required: true },
    { name: 'dinnerCutoff', label: 'Dinner skip cutoff', type: 'time', required: true },
  ]
  if (tab === 'profile') return [
    { name: 'name', label: 'Your name', required: true, placeholder: 'Full name' },
    { name: 'phone', label: 'Phone number', placeholder: 'Your contact number' },
    { name: 'address', label: 'Delivery address', type: 'textarea', placeholder: 'Your delivery address' },
  ]
  return []
}

function FormModal({
  title,
  fields,
  values,
  busy,
  onChange,
  onClose,
  onSubmit,
}: {
  title: string
  fields: Field[]
  values: Record<string, string>
  busy: boolean
  onChange: (name: string, value: string) => void
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#211b18]/45 backdrop-blur-[3px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form onSubmit={onSubmit} className="w-full max-w-[470px] rounded-t-[24px] border border-[#f0e5df] bg-white p-5 shadow-[0_24px_70px_rgba(33,27,24,0.2)] sm:rounded-[24px] sm:p-7" aria-labelledby="form-title">
        <div className="mb-6 flex items-start justify-between"><div><p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary">TiffinTrack workspace</p><h2 id="form-title" className="text-xl font-extrabold tracking-tight">{title}</h2></div><button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full bg-[#fff5f0] text-muted-foreground hover:text-primary" aria-label="Close dialog"><X size={18} /></button></div>
        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          {fields.map((field) => (
            <label key={field.name} className="flex flex-col gap-1.5 text-xs font-bold">
              {field.label}
              {field.type === 'select' ? (
                <select required={field.required} value={values[field.name] || ''} onChange={(event) => onChange(field.name, event.target.value)}>
                  <option value="">Choose…</option>
                  {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea required={field.required} value={values[field.name] || ''} onChange={(event) => onChange(field.name, event.target.value)} placeholder={field.placeholder} rows={3} className="w-full resize-y rounded-xl border border-[#eadbd3] bg-white px-3.5 py-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
              ) : (
                <input required={field.required} type={field.type || 'text'} min={field.type === 'number' ? '0' : undefined} value={values[field.name] || ''} onChange={(event) => onChange(field.name, event.target.value)} placeholder={field.placeholder} className="h-11 rounded-xl border border-[#eadbd3] bg-white px-3.5 text-sm font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
              )}
            </label>
          ))}
        </div>
        <div className="mt-6 flex gap-3"><button type="button" onClick={onClose} className="secondary-action flex-1">Cancel</button><button type="submit" disabled={busy} className="primary-action flex-1">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{busy ? 'Saving…' : 'Save changes'}</button></div>
      </form>
    </div>
  )
}

function JoinBusiness({
  name,
  busy,
  error,
  onJoin,
  onSignOut,
}: {
  name: string
  busy: boolean
  error: string
  onJoin: (code: string) => void
  onSignOut: () => void
}) {
  const [code, setCode] = useState('')
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff9f5] px-5 py-10">
      <section className="w-full max-w-[470px] rounded-[26px] border border-[#f0e5df] bg-white p-6 shadow-[0_20px_60px_rgba(52,31,20,0.08)] sm:p-8">
        <Brand />
        <span className="mt-8 flex size-12 items-center justify-center rounded-2xl bg-[#fff0e9] text-primary"><Users size={23} /></span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Welcome, {name.split(' ')[0]}.</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Enter the invite code from your tiffin provider to see your menus, subscriptions, and deliveries.</p>
        <form className="mt-6" onSubmit={(event) => { event.preventDefault(); onJoin(code.trim()) }}>
          <label className="flex flex-col gap-2 text-xs font-bold">Business invite code<input required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="e.g. 8FA12BCD" autoComplete="off" className="h-12 rounded-xl border border-[#eadbd3] px-4 text-sm uppercase outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
          {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-destructive" role="alert">{error}</p>}
          <button disabled={busy} className="primary-action mt-4">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />} Join your tiffin service</button>
        </form>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">Don&apos;t have a code? Ask your tiffin provider to create your customer profile and share their invite code.</p>
        <button onClick={onSignOut} className="mt-5 text-xs font-bold text-primary hover:underline">Sign out</button>
      </section>
    </main>
  )
}

function SettingsPage({
  business,
  inviteCode,
  onEdit,
}: {
  business: Row | null
  inviteCode: string
  onEdit: () => void
}) {
  const [copyStatus, setCopyStatus] = useState('Copy code')
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopyStatus('Copied!')
    } catch {
      setCopyStatus('Clipboard unavailable')
    }
  }
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeading eyebrow="Make it yours" title="Business settings" description="Your service details and customer invite code." />
      <section className="mt-6 rounded-[20px] border border-[#f0e5df] bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-extrabold">Service profile</h2><p className="mt-1 text-xs text-muted-foreground">These details help your team manage daily meals.</p></div><button className="secondary-action" onClick={onEdit}><Settings size={15} /> Edit settings</button></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Info label="Business name" value={text(business?.name) || 'Not set'} />
          <Info label="Lunch skip cutoff" value={text(business?.lunchCutoff) || '10:00'} />
          <Info label="Dinner skip cutoff" value={text(business?.dinnerCutoff) || '17:00'} />
        </div>
      </section>
      <section className="mt-4 rounded-[20px] border border-[#f0e5df] bg-white p-5 md:p-6">
        <div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#fff0e9] text-primary"><Users size={19} /></span><div><h2 className="font-extrabold">Invite your customers</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Share this code so customers can create an account and connect to your service.</p></div></div>
        <div className="mt-5 flex flex-wrap items-center gap-3"><code className="rounded-xl border border-dashed border-[#eac4b5] bg-[#fff9f5] px-4 py-3 text-lg font-extrabold tracking-[0.15em] text-[#b8462a]">{inviteCode || 'Loading…'}</code><button onClick={() => void copyCode()} disabled={!inviteCode} className="secondary-action"><Check size={15} /> {copyStatus}</button></div>
      </section>
    </div>
  )
}

function ProfilePage({ name, phone, address, onEdit }: { name: string; phone: string; address: string; onEdit: () => void }) {
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeading eyebrow="Your account" title="My profile" description="Keep your contact and delivery details up to date." />
      <section className="mt-6 rounded-[20px] border border-[#f0e5df] bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-full bg-[#ffe5d8] font-extrabold text-[#9d482e]">{name.slice(0, 1).toUpperCase()}</span><div><p className="font-extrabold">{name}</p><p className="text-xs text-muted-foreground">Customer account</p></div></div><button className="secondary-action" onClick={onEdit}><Settings size={15} /> Edit profile</button></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Phone number" value={phone || 'Not added'} /><Info label="Delivery address" value={address || 'Not added'} /></div>
      </section>
    </div>
  )
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary">{eyebrow}</p><h1 className="text-3xl font-extrabold tracking-[-0.05em] md:text-4xl">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p></div>
}
function ReportsPage({ rows, defaulters }: { rows: Row[]; defaulters: Row[] }) {
  const maxRevenue = Math.max(1, ...rows.map((row) => Number(row.revenue || 0)))
  const revenueTotal = rows.reduce((total, row) => total + Number(row.revenue || 0), 0)
  const deliveriesTotal = rows.reduce((total, row) => total + Number(row.deliveries || 0), 0)
  const skipsTotal = rows.reduce((total, row) => total + Number(row.skips || 0), 0)
  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeading eyebrow="Business insights" title="Reports & analytics" description="A clear view of your collections, completed deliveries, and approved meal skips." />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Info label="Collected · last 6 months" value={money(revenueTotal)} />
        <Info label="Deliveries completed" value={String(deliveriesTotal)} />
        <Info label="Approved meal skips" value={String(skipsTotal)} />
      </div>
      <section className="mt-5 rounded-[20px] border border-[#f0e5df] bg-white p-5 md:p-7">
        <div className="mb-7"><h2 className="text-sm font-extrabold">Monthly collections</h2><p className="mt-1 text-xs text-muted-foreground">Payments recorded in the last six months.</p></div>
        <div className="flex h-[220px] items-end gap-3 border-b border-[#f0e5df] pb-0 sm:gap-5">
          {rows.map((row) => {
            const height = Math.max(5, (Number(row.revenue || 0) / maxRevenue) * 100)
            const label = new Date(`${text(row.month)}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'short' })
            return (
              <div key={text(row.month)} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <span className="absolute bottom-[calc(100%-5px)] mb-1 hidden whitespace-nowrap rounded-lg bg-[#211b18] px-2 py-1 text-[9px] font-bold text-white group-hover:block">{label}: {money(row.revenue)}</span>
                <div className="w-full max-w-14 rounded-t-lg bg-[#f04424] transition-colors group-hover:bg-[#d9381b]" style={{ height: `${height}%` }} />
                <span className="absolute -bottom-6 text-[10px] font-semibold text-muted-foreground">{label}</span>
              </div>
            )
          })}
        </div>
        {!rows.length && <p className="mt-5 text-center text-xs text-muted-foreground">Monthly activity will appear here as you record payments and deliveries.</p>}
        <p className="mt-9 flex items-center gap-2 text-[10px] text-muted-foreground"><span className="size-2 rounded-sm bg-primary" /> Payments collected</p>
      </section>
      <section className="mt-5 overflow-hidden rounded-[20px] border border-[#f0e5df] bg-white">
        <div className="border-b border-[#f0e5df] bg-[#fffaf7] px-5 py-3"><h2 className="text-xs font-extrabold">Monthly activity</h2></div>
        <div className="grid grid-cols-3 px-5 py-2 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground"><span>Month</span><span className="text-center">Delivered</span><span className="text-right">Skips</span></div>
        {rows.map((row) => <div key={text(row.month)} className="grid grid-cols-3 border-t border-[#f3ece7] px-5 py-3 text-xs"><span className="font-bold">{new Date(`${text(row.month)}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span><span className="text-center">{text(row.deliveries)}</span><span className="text-right">{text(row.skips)}</span></div>)}
      </section>
      <section className="mt-5 overflow-hidden rounded-[20px] border border-[#f0e5df] bg-white">
        <div className="border-b border-[#f0e5df] bg-[#fffaf7] px-5 py-3"><h2 className="text-xs font-extrabold">Outstanding customer balances</h2></div>
        {!defaulters.length ? <p className="px-5 py-6 text-center text-xs text-muted-foreground">No pending balances. Nicely done.</p> : defaulters.map((bill) => <div key={text(bill._id)} className="flex items-center justify-between gap-4 border-b border-[#f3ece7] px-5 py-3 last:border-0"><div className="min-w-0"><p className="truncate text-xs font-bold">{text(bill.customerName)}</p><p className="mt-1 text-[10px] text-muted-foreground">{text(bill.customerEmail)} · {text(bill.billingMonth)}</p></div><p className="shrink-0 text-xs font-extrabold text-[#b44b32]">{money(bill.amountDue)} due</p></div>)}
      </section>
    </div>
  )
}
function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#fff9f5] p-3.5"><p className="text-[10px] font-bold text-muted-foreground">{label}</p><p className="mt-1 text-sm font-extrabold">{value}</p></div>
}
