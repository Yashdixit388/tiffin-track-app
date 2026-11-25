'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CreditCard,
  Download,
  Home,
  Package,
  Plus,
  Settings,
  Soup,
  Sparkles,
  Trash2,
  Utensils,
  Wallet,
  X,
} from 'lucide-react'

type Tiffin = { id: string; date: string; meal: string; quantity: number; price: number }
type Payment = { id: string; date: string; amount: number; method: string; note: string }
type Tab = 'home' | 'tiffins' | 'payments' | 'reports' | 'settings'

const localDate = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const money = (amount: number) => `₹${Math.abs(amount).toLocaleString('en-IN')}`
const fmt = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
const nav: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Overview', icon: Home },
  { id: 'tiffins', label: 'Tiffin history', icon: Package },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'reports', label: 'Reports', icon: CalendarDays },
]

export function TrackerApp() {
  const [tab, setTab] = useState<Tab>('home')
  const [tiffins, setTiffins] = useState<Tiffin[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [storageReady, setStorageReady] = useState(false)
  const [modal, setModal] = useState<'tiffin' | 'payment' | null>(null)
  const [toast, setToast] = useState('')
  const [date, setDate] = useState(localDate)
  const [meal, setMeal] = useState('Lunch')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(100)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('UPI')
  const [note, setNote] = useState('')

  useEffect(() => {
    try {
      setTiffins(JSON.parse(localStorage.getItem('tiffins') || '[]'))
      setPayments(JSON.parse(localStorage.getItem('payments') || '[]'))
    } catch {
      setTiffins([])
      setPayments([])
    } finally {
      setStorageReady(true)
    }
  }, [])

  useEffect(() => {
    if (!storageReady) return
    localStorage.setItem('tiffins', JSON.stringify(tiffins))
    localStorage.setItem('payments', JSON.stringify(payments))
  }, [tiffins, payments, storageReady])

  const stats = useMemo(() => {
    const used = tiffins.reduce((total, item) => total + item.quantity * item.price, 0)
    const paid = payments.reduce((total, item) => total + item.amount, 0)
    const monthKey = localDate().slice(0, 7)
    const month = tiffins.filter((item) => item.date.startsWith(monthKey))
    const todayKey = localDate()
    const todayItems = tiffins.filter((item) => item.date === todayKey)
    return {
      used,
      paid,
      balance: paid - used,
      month,
      today: todayItems.reduce((total, item) => total + item.quantity, 0),
      todayUsed: todayItems.reduce((total, item) => total + item.quantity * item.price, 0),
    }
  }, [tiffins, payments])

  const monthLabel = new Date(`${localDate()}T12:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  const save = () => {
    if (modal === 'tiffin') {
      if (quantity < 1 || price < 0) return notify('Enter valid tiffin details')
      setTiffins((items) =>
        [...items, { id: crypto.randomUUID(), date, meal, quantity, price }].sort((a, b) =>
          b.date.localeCompare(a.date),
        ),
      )
      notify('Tiffin saved')
    } else {
      const value = Number(amount)
      if (value <= 0) return notify('Payment must be greater than zero')
      setPayments((items) =>
        [...items, { id: crypto.randomUUID(), date, amount: value, method, note }].sort((a, b) =>
          b.date.localeCompare(a.date),
        ),
      )
      setAmount('')
      setNote('')
      notify('Payment added')
    }
    setModal(null)
  }

  const removeTiffin = (id: string) => {
    setTiffins((items) => items.filter((item) => item.id !== id))
    notify('Record deleted')
  }
  const removePayment = (id: string) => {
    setPayments((items) => items.filter((item) => item.id !== id))
    notify('Payment deleted')
  }
  const exportData = (kind: 'csv' | 'json') => {
    const content =
      kind === 'csv'
        ? `Date,Tiffins,Price,Amount\n${tiffins.map((item) => `${item.date},${item.quantity},${item.price},${item.quantity * item.price}`).join('\n')}`
        : JSON.stringify({ tiffins, payments }, null, 2)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([content]))
    link.download = `tiffin-backup.${kind}`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const pageTitle: Record<Tab, string> = {
    home: 'Your daily overview',
    tiffins: 'Tiffin history',
    payments: 'Payments',
    reports: 'Monthly report',
    settings: 'Settings',
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border bg-[#fffdfb] px-5 py-7 lg:flex">
          <Brand />
          <p className="mb-3 mt-10 px-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#aaa09a]">
            Workspace
          </p>
          <nav className="flex flex-col gap-1.5" aria-label="Main navigation">
            {nav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`nav-link ${tab === id ? 'nav-link-active' : ''}`}
                aria-current={tab === id ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={1.8} />
                {label}
                {id === 'home' && tab === id && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
              </button>
            ))}
          </nav>
          <button
            onClick={() => setTab('settings')}
            className={`nav-link mt-1 ${tab === 'settings' ? 'nav-link-active' : ''}`}
          >
            <Settings size={18} strokeWidth={1.8} />
            Settings
          </button>
          <div className="mt-auto rounded-2xl bg-[#fff2eb] p-4">
            <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
              <Sparkles size={17} />
            </div>
            <p className="text-sm font-bold">A little more organized.</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Your tiffins and payments, together in one happy place.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-border pt-5">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#ffe5d8] text-sm font-bold text-[#9d482e]">
              A
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Your account</p>
              <p className="text-xs text-muted-foreground">Personal workspace</p>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border bg-[#fff9f5]/95 px-5 backdrop-blur-md md:px-8 lg:px-10">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
                <Soup size={20} />
              </div>
              <span className="text-sm font-bold tracking-tight">Tiffin <span className="text-primary">Tracker</span></span>
            </div>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <span className="font-semibold text-foreground">{pageTitle[tab]}</span>
            </div>
            <div className="flex items-center gap-3">
              <p className="hidden text-sm text-muted-foreground sm:block">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <button
                onClick={() => setTab('settings')}
                className="flex size-10 items-center justify-center rounded-full border border-border bg-white text-muted-foreground hover:text-primary"
                aria-label="Open settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </header>

          <div className="w-full flex-1 px-5 py-7 md:px-8 md:py-9 lg:px-10 lg:py-10">
            {tab === 'home' && (
              <HomeView
                stats={stats}
                tiffins={tiffins}
                payments={payments}
                monthLabel={monthLabel}
                addTiffin={() => setModal('tiffin')}
                addPayment={() => setModal('payment')}
                go={setTab}
              />
            )}
            {tab === 'tiffins' && (
              <List
                title="Tiffin history"
                description="Every meal, all in one place."
                empty="No tiffins recorded yet"
                items={tiffins}
                add={() => setModal('tiffin')}
                remove={removeTiffin}
                kind="tiffin"
              />
            )}
            {tab === 'payments' && (
              <List
                title="Payments"
                description="Keep an eye on your advance balance."
                empty="No payments yet"
                items={payments}
                add={() => setModal('payment')}
                remove={removePayment}
                kind="payment"
              />
            )}
            {tab === 'reports' && <Report stats={stats} monthLabel={monthLabel} />}
            {tab === 'settings' && (
              <SettingsView price={price} setPrice={setPrice} exportData={exportData} />
            )}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 px-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg lg:hidden" aria-label="Mobile navigation">
        <div className="mx-auto flex max-w-lg justify-around">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold ${tab === id ? 'text-primary' : 'text-muted-foreground'}`}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={tab === id ? 2.2 : 1.8} />
              <span>{label === 'Tiffin history' ? 'Tiffins' : label}</span>
            </button>
          ))}
          <button
            onClick={() => setTab('settings')}
            className={`flex min-w-[54px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold ${tab === 'settings' ? 'text-primary' : 'text-muted-foreground'}`}
            aria-label="Settings"
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>
        </div>
      </nav>

      {modal && (
        <Modal title={modal === 'tiffin' ? 'Add a tiffin' : 'Add a payment'} close={() => setModal(null)}>
          <label>
            Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          {modal === 'tiffin' ? (
            <>
              <label>
                Meal
                <select value={meal} onChange={(event) => setMeal(event.target.value)}>
                  <option>Lunch</option>
                  <option>Dinner</option>
                  <option>Both</option>
                </select>
              </label>
              <label>
                Number of tiffins
                <div className="flex items-center gap-4">
                  <button type="button" className="step" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Remove one tiffin">−</button>
                  <strong className="min-w-5 text-center text-lg">{quantity}</strong>
                  <button type="button" className="step" onClick={() => setQuantity(quantity + 1)} aria-label="Add one tiffin">+</button>
                </div>
              </label>
              <label>
                Price per tiffin
                <input type="number" min="0" value={price} onChange={(event) => setPrice(+event.target.value)} />
              </label>
              <div className="flex items-center justify-between rounded-xl bg-[#fff4ee] px-4 py-3.5 text-sm text-muted-foreground">
                Total <b className="text-base text-foreground">{money(quantity * price)}</b>
              </div>
            </>
          ) : (
            <>
              <label>
                Amount
                <input type="number" min="1" placeholder="3000" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </label>
              <label>
                Payment method
                <select value={method} onChange={(event) => setMethod(event.target.value)}>
                  <option>UPI</option>
                  <option>Cash</option>
                  <option>Bank transfer</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Note <span className="font-normal text-muted-foreground">(optional)</span>
                <input placeholder="Monthly advance" value={note} onChange={(event) => setNote(event.target.value)} />
              </label>
            </>
          )}
          <button className="primary-action mt-1" onClick={save}>
            <Check size={17} />
            {modal === 'tiffin' ? 'Save tiffin' : 'Add payment'}
          </button>
        </Modal>
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#211b18] px-5 py-3 text-sm font-medium text-white shadow-xl lg:bottom-7" role="status">
          <Check size={16} className="text-[#ff9878]" />
          {toast}
        </div>
      )}
    </main>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-[15px] bg-primary text-white shadow-[0_8px_18px_rgba(240,68,36,0.2)]">
        <Soup size={23} strokeWidth={2} />
      </div>
      <div>
        <p className="text-[17px] font-extrabold tracking-[-0.04em]">Tiffin <span className="text-primary">Tracker</span></p>
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground">YOUR DAILY COMPANION</p>
      </div>
    </div>
  )
}

type Stats = {
  used: number
  paid: number
  balance: number
  month: Tiffin[]
  today: number
  todayUsed: number
}

function HomeView({
  stats,
  tiffins,
  payments,
  monthLabel,
  addTiffin,
  addPayment,
  go,
}: {
  stats: Stats
  tiffins: Tiffin[]
  payments: Payment[]
  monthLabel: string
  addTiffin: () => void
  addPayment: () => void
  go: (tab: Tab) => void
}) {
  const monthCount = stats.month.reduce((total, item) => total + item.quantity, 0)
  const monthUsed = stats.month.reduce((total, item) => total + item.quantity * item.price, 0)
  const monthPaid = payments
    .filter((payment) => payment.date.startsWith(localDate().slice(0, 7)))
    .reduce((total, payment) => total + payment.amount, 0)
  const activity = [
    ...tiffins.map((item) => ({ ...item, kind: 'tiffin' as const })),
    ...payments.map((item) => ({ ...item, kind: 'payment' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)

  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f2ded4] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#b45a40]">
            <span className="size-1.5 rounded-full bg-[#ed7d5f]" />
            Your personal tiffin space
          </div>
          <h1 className="text-[2rem] font-extrabold leading-tight tracking-[-0.055em] md:text-[2.65rem]">
            Good food, <span className="text-primary">well tracked.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">A fresh look at your tiffins and balance.</p>
        </div>
        <button className="primary-small" onClick={addTiffin}>
          <Plus size={17} /> Add a tiffin
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">
        <section className="relative min-h-[250px] overflow-hidden rounded-[26px] bg-[#f04424] p-6 text-white shadow-[0_18px_40px_rgba(192,64,37,0.17)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-32 size-[340px] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-3 -top-16 size-[260px] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 right-28 size-[220px] rounded-full bg-[#ff8867]/30 blur-[1px]" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                  <Wallet size={17} /> Advance balance
                </div>
                <p className="mt-4 text-[2.9rem] font-extrabold leading-none tracking-[-0.06em] md:text-[3.6rem]">{money(stats.balance)}</p>
                <p className="mt-3 max-w-xs text-sm leading-6 text-white/75">Your remaining balance, calculated from all your tiffins and payments.</p>
              </div>
              <div className="relative hidden size-[116px] shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 sm:flex md:size-[142px]">
                <div className="absolute inset-3 rounded-full border border-dashed border-white/40" />
                <div className="flex size-[72px] items-center justify-center rounded-full bg-[#fff1e9] text-[#d84d2d] shadow-xl md:size-[88px]">
                  <Utensils size={34} strokeWidth={1.6} />
                </div>
                <span className="absolute -right-1 top-2 flex size-8 items-center justify-center rounded-full bg-[#ffc76c] text-[#743b1e]">
                  <Sparkles size={15} />
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-white/20 pt-4 text-sm">
              <div><p className="text-[11px] uppercase tracking-[0.12em] text-white/65">Total paid</p><p className="mt-1 font-bold">{money(stats.paid)}</p></div>
              <div><p className="text-[11px] uppercase tracking-[0.12em] text-white/65">Tiffins used</p><p className="mt-1 font-bold">{money(stats.used)}</p></div>
              <div className="ml-auto hidden items-center gap-1.5 self-end text-xs font-semibold text-white/80 sm:flex"><Check size={14} /> Up to date</div>
            </div>
          </div>
        </section>

        <section className="surface-card flex flex-col justify-between overflow-hidden p-6 md:p-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">On today&apos;s menu</p>
              <p className="mt-4 text-[3.25rem] font-extrabold leading-none tracking-[-0.06em]">{stats.today}<span className="ml-2 text-base font-semibold tracking-normal text-muted-foreground">tiffins</span></p>
              <p className="mt-2 text-sm text-muted-foreground">Received today · {money(stats.todayUsed)} value</p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#fff0e8] text-primary">
              <Soup size={23} />
            </div>
          </div>
          <div className="mt-7 flex items-center gap-3 rounded-xl bg-[#fff8f4] p-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
              {stats.today ? <Check size={17} /> : <CalendarDays size={17} />}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {stats.today ? 'Today is looking delicious. Your tiffin is logged.' : 'No tiffins logged today. Add one to keep your records fresh.'}
            </p>
          </div>
          <button className="primary-action mt-4" onClick={addTiffin}>
            <Plus size={17} /> Log today&apos;s tiffin
          </button>
        </section>
      </div>

      <section className="mt-9">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><h2 className="text-lg font-bold tracking-tight">Your month at a glance</h2><p className="mt-1 text-sm text-muted-foreground">{monthLabel} overview</p></div>
          <button className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:gap-2" onClick={() => go('reports')}>
            Full report <ArrowRight size={16} />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat icon={Package} label="Tiffins received" value={String(monthCount)} detail="this month" color="orange" />
          <Stat icon={ArrowDownLeft} label="Amount used" value={money(monthUsed)} detail="this month" color="peach" />
          <Stat icon={CreditCard} label="Paid this month" value={money(monthPaid)} detail={`${payments.length} payment${payments.length === 1 ? '' : 's'} recorded`} color="green" />
        </div>
      </section>

      <div className="mt-9 grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <section>
          <h2 className="text-lg font-bold tracking-tight">Quick actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">The little things, made easy.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="quick-action min-h-[82px] flex-col gap-2" onClick={addTiffin}>
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#fff0e9] text-primary"><Plus size={18} /></span>
              Add a tiffin
            </button>
            <button className="quick-action min-h-[82px] flex-col gap-2" onClick={addPayment}>
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#f1f3eb] text-[#697b4f]"><CreditCard size={17} /></span>
              Add payment
            </button>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="text-lg font-bold tracking-tight">Recent activity</h2><p className="mt-1 text-sm text-muted-foreground">Your latest tiffins and payments.</p></div>
            <button className="text-sm font-bold text-primary" onClick={() => go('tiffins')}>See history</button>
          </div>
          {!activity.length ? <Empty /> : (
            <div className="surface-card divide-y divide-border px-4">
              {activity.map((item) => {
                const isTiffin = item.kind === 'tiffin'
                return (
                  <div key={item.id} className="flex items-center gap-3 py-3.5">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${isTiffin ? 'bg-[#fff0e9] text-primary' : 'bg-[#f1f3eb] text-[#697b4f]'}`}>
                      {isTiffin ? <Soup size={19} /> : <CreditCard size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{isTiffin ? `${item.quantity} tiffin${item.quantity > 1 ? 's' : ''} · ${item.meal}` : item.note || 'Advance payment'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{fmt(item.date)}{!isTiffin && ` · ${item.method}`}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-bold ${isTiffin ? 'text-foreground' : 'text-[#697b4f]'}`}>
                      {isTiffin ? '−' : '+'}{money(isTiffin ? item.quantity * item.price : item.amount)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
  color,
}: {
  icon: typeof Package
  label: string
  value: string
  detail: string
  color: 'orange' | 'peach' | 'green'
}) {
  const iconColor = {
    orange: 'bg-[#fff0e9] text-primary',
    peach: 'bg-[#fff3e8] text-[#b46b38]',
    green: 'bg-[#f1f3eb] text-[#697b4f]',
  }[color]
  return (
    <div className="surface-card p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
        <span className={`flex size-9 items-center justify-center rounded-xl ${iconColor}`}><Icon size={17} /></span>
      </div>
      <p className="mt-4 text-[1.55rem] font-extrabold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-[#e9d8ce] bg-white/70 px-5 py-8 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-[#fff0e9] text-primary"><Package size={21} /></div>
      <p className="mt-3 text-sm font-bold">Nothing on the table yet</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Add a tiffin or payment and your activity will show up here.</p>
    </div>
  )
}

function List({
  title,
  description,
  empty,
  items,
  add,
  remove,
  kind,
}: {
  title: string
  description: string
  empty: string
  items: Tiffin[] | Payment[]
  add: () => void
  remove: (id: string) => void
  kind: 'tiffin' | 'payment'
}) {
  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">{kind === 'tiffin' ? 'Meals' : 'Wallet'}</p><h1 className="text-3xl font-extrabold tracking-[-0.05em] md:text-4xl">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p></div>
        <button className="primary-small" onClick={add}><Plus size={17} /> Add {kind}</button>
      </div>
      {!items.length ? (
        <div className="surface-card px-6 py-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#fff0e9] text-primary">{kind === 'tiffin' ? <Soup size={25} /> : <CreditCard size={24} />}</div>
          <h2 className="mt-4 font-bold">{empty}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your records will be neatly organized here.</p>
          <button className="primary-small mx-auto mt-5" onClick={add}><Plus size={16} /> Add {kind}</button>
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="hidden grid-cols-[1fr_1fr_auto] border-b border-border bg-[#fffaf7] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground sm:grid">
            <span>Date & details</span><span>{kind === 'tiffin' ? 'Meal' : 'Method'}</span><span className="pr-12 text-right">Amount</span>
          </div>
          {items.map((item) => {
            const tiffin = kind === 'tiffin' ? item as Tiffin : null
            const payment = kind === 'payment' ? item as Payment : null
            return (
              <div key={item.id} className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:gap-5 sm:px-5">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tiffin ? 'bg-[#fff0e9] text-primary' : 'bg-[#f1f3eb] text-[#697b4f]'}`}>{tiffin ? <Soup size={19} /> : <CreditCard size={18} />}</div>
                <div className="min-w-0 flex-1 sm:grid sm:grid-cols-2 sm:items-center">
                  <div><p className="text-sm font-bold">{fmt(item.date)}</p><p className="mt-1 truncate text-xs text-muted-foreground sm:hidden">{tiffin ? `${tiffin.quantity} tiffin${tiffin.quantity > 1 ? 's' : ''} at ${money(tiffin.price)} each` : payment?.note || 'Advance payment'}</p></div>
                  <p className="hidden text-sm text-muted-foreground sm:block">{tiffin ? `${tiffin.meal} · ${tiffin.quantity} tiffin${tiffin.quantity > 1 ? 's' : ''}` : payment?.method}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${payment ? 'text-[#697b4f]' : ''}`}>{tiffin ? `−${money(tiffin.quantity * tiffin.price)}` : `+${money(payment?.amount || 0)}`}</p>
                  <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{tiffin ? `${money(tiffin.price)} per tiffin` : payment?.note || 'Advance payment'}</p>
                </div>
                <button onClick={() => remove(item.id)} className="ml-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-destructive" aria-label={`Delete ${kind} from ${fmt(item.date)}`}><Trash2 size={17} /></button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Report({ stats, monthLabel }: { stats: Stats; monthLabel: string }) {
  const total = stats.month.reduce((sum, item) => sum + item.quantity, 0)
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const daily = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    return {
      day,
      count: stats.month.filter((item) => Number(item.date.slice(-2)) === day).reduce((sum, item) => sum + item.quantity, 0),
    }
  })
  const peak = Math.max(1, ...daily.map((item) => item.count))
  const average = stats.month.length ? (total / stats.month.length).toFixed(1) : '0'

  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="mb-7"><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">Your insights</p><h1 className="text-3xl font-extrabold tracking-[-0.05em] md:text-4xl">Monthly report</h1><p className="mt-2 text-sm text-muted-foreground">A little perspective on your everyday routine.</p></div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Package} label="Tiffins received" value={String(total)} detail={monthLabel} color="orange" />
        <Stat icon={ArrowDownLeft} label="Amount used" value={money(stats.month.reduce((sum, item) => sum + item.quantity * item.price, 0))} detail="this month" color="peach" />
        <Stat icon={CalendarDays} label="Active days" value={String(stats.month.length)} detail={`in ${monthLabel}`} color="green" />
        <Stat icon={Utensils} label="Daily average" value={average} detail="tiffins per active day" color="orange" />
      </div>
      <section className="surface-card p-5 md:p-7">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-bold">Daily tiffin consumption</h2><p className="mt-1 text-xs text-muted-foreground">Number of tiffins received each day in {monthLabel}.</p></div>
          <span className="rounded-full bg-[#fff0e9] px-3 py-1.5 text-xs font-bold text-primary">{total} total</span>
        </div>
        <div className="flex h-[210px] items-end gap-1 border-b border-border pb-0 sm:gap-1.5">
          {daily.map(({ day, count }) => (
            <div key={day} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span className="pointer-events-none absolute bottom-[calc(100%-5px)] z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-[#211b18] px-2 py-1 text-[10px] font-semibold text-white group-hover:block">{day} · {count} tiffin{count === 1 ? '' : 's'}</span>
              <div className={`w-full rounded-t-[5px] transition-all duration-200 ${count ? 'bg-[#f04424] group-hover:bg-[#d9381b]' : 'bg-[#f6ede8]'}`} style={{ height: count ? `${Math.max(8, (count / peak) * 100)}%` : '4px' }} />
              {(day === 1 || day === daysInMonth || day % 5 === 0) && <span className="absolute -bottom-6 text-[9px] text-muted-foreground">{day}</span>}
            </div>
          ))}
        </div>
        <div className="mt-9 flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-sm bg-primary" /> Tiffins received</div>
      </section>
    </div>
  )
}

function SettingsView({
  price,
  setPrice,
  exportData,
}: {
  price: number
  setPrice: (price: number) => void
  exportData: (kind: 'csv' | 'json') => void
}) {
  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-7"><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">Make it yours</p><h1 className="text-3xl font-extrabold tracking-[-0.05em] md:text-4xl">Settings</h1><p className="mt-2 text-sm text-muted-foreground">A few details to make Tiffin Tracker feel like your own.</p></div>
      <div className="flex flex-col gap-4">
        <section className="surface-card p-5 md:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#fff0e9] text-primary"><Home size={19} /></span><div><h2 className="font-bold">Provider details</h2><p className="text-xs text-muted-foreground">Set up the details you use most.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>Provider name<input defaultValue="Sharma Tiffin Service" /></label>
            <label>Default price per tiffin<input type="number" min="0" value={price} onChange={(event) => setPrice(+event.target.value)} /></label>
          </div>
        </section>
        <section className="surface-card p-5 md:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#f1f3eb] text-[#697b4f]"><Download size={19} /></span><div><h2 className="font-bold">Data & backup</h2><p className="text-xs text-muted-foreground">Take a copy of your records whenever you like.</p></div></div>
          <div className="flex flex-wrap gap-3">
            <button className="secondary-action" onClick={() => exportData('csv')}><Download size={16} /> Export CSV</button>
            <button className="secondary-action" onClick={() => exportData('json')}><Download size={16} /> Backup JSON</button>
          </div>
        </section>
      </div>
    </div>
  )
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop fixed inset-0 z-40 flex items-end justify-center bg-[#211b18]/45 backdrop-blur-[3px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <div className="modal-panel w-full max-w-[440px] rounded-t-[24px] border border-border bg-white p-5 shadow-[0_24px_70px_rgba(33,27,24,0.2)] sm:rounded-[24px] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="mb-6 flex items-start justify-between">
          <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Your records</p><h2 id="modal-title" className="text-xl font-extrabold tracking-tight">{title}</h2></div>
          <button onClick={close} className="flex size-9 items-center justify-center rounded-full bg-[#fff5f0] text-muted-foreground hover:text-primary" aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
