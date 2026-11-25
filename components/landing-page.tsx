import Link from 'next/link'
import {
  ArrowDownLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Menu,
  PackageCheck,
  Soup,
  Sparkles,
  Users,
} from 'lucide-react'

const features = [
  { icon: Users, title: 'Customers, together', body: 'Keep customer details, delivery addresses, and meal plans in one tidy place.' },
  { icon: CalendarCheck, title: 'Menus & meal skips', body: 'Share what is cooking and let customers skip a meal before your cutoff.' },
  { icon: PackageCheck, title: 'Know what to prepare', body: 'Build a clear daily order list and keep delivery progress up to date.' },
  { icon: CreditCard, title: 'Bills without the guesswork', body: 'See delivered meals, skip deductions, payments, and what is still due.' },
]

export function LandingPage() {
  return (
    <main className="overflow-hidden bg-[#fff9f5] text-[#171717]">
      <header className="relative z-20 border-b border-[#f0e5df] bg-[#fff9f5]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="TiffinTrack home">
            <span className="flex size-10 items-center justify-center rounded-[14px] bg-[#f04424] text-white shadow-[0_8px_18px_rgba(240,68,36,0.2)]"><Soup size={22} /></span>
            <span className="text-[17px] font-extrabold tracking-[-0.05em]">Tiffin<span className="text-[#f04424]">Track</span></span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#6f6965] md:flex" aria-label="Main navigation">
            <a href="#features" className="transition hover:text-[#f04424]">Features</a>
            <a href="#how-it-works" className="transition hover:text-[#f04424]">How it works</a>
            <a href="#for-everyone" className="transition hover:text-[#f04424]">For everyone</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/sign-in" className="rounded-xl px-3 py-2.5 text-sm font-bold text-[#3d3733] transition hover:bg-[#fff0e9] hover:text-[#f04424] sm:px-4">Sign in</Link>
            <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-[#f04424] px-4 py-2.5 text-sm font-bold text-white shadow-[0_7px_16px_rgba(240,68,36,0.18)] transition hover:-translate-y-0.5 hover:bg-[#d9381b] sm:px-5">
              Get started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-20 pt-14 md:px-8 md:pb-24 md:pt-20 lg:grid-cols-[1fr_0.95fr] lg:gap-8 lg:pt-24">
        <div className="pointer-events-none absolute -left-44 top-24 size-80 rounded-full bg-[#ffe9dc]/70 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f2ded4] bg-white/80 px-3.5 py-2 text-xs font-bold text-[#a44e36] shadow-sm">
            <Sparkles size={14} className="text-[#f04424]" /> A little more ease in every day
          </div>
          <h1 className="max-w-[650px] text-[2.9rem] font-extrabold leading-[1.04] tracking-[-0.065em] sm:text-6xl xl:text-[4.5rem]">
            Your tiffin service, <span className="text-[#f04424]">beautifully</span> in sync.
          </h1>
          <p className="mt-6 max-w-[540px] text-base leading-7 text-[#77716e] md:text-lg md:leading-8">
            The calmer way to run a tiffin business. Bring customers, menus, daily orders, deliveries, and billing together in one simple workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sign-up" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f04424] px-6 text-sm font-bold text-white shadow-[0_10px_22px_rgba(240,68,36,0.2)] transition hover:-translate-y-0.5 hover:bg-[#d9381b]">
              Create your workspace <ArrowRight size={17} />
            </Link>
            <a href="#features" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#eadbd3] bg-white px-5 text-sm font-bold text-[#3d3733] transition hover:border-[#f0b5a2] hover:text-[#f04424]">
              Explore the features <ChevronRight size={16} />
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-[#77716e]">
            {['Made for tiffin teams', 'Owner and customer spaces', 'Simple, transparent records'].map((item) => (
              <span key={item} className="inline-flex items-center gap-2"><span className="flex size-4 items-center justify-center rounded-full bg-[#ffe9df] text-[#d84a2c]"><Check size={11} /></span>{item}</span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[570px] lg:ml-auto">
          <div className="absolute -right-7 top-4 size-28 rounded-full bg-[#ffe0d2] blur-2xl" />
          <div className="absolute -bottom-8 left-4 size-32 rounded-full bg-[#f8d7af]/60 blur-2xl" />
          <div className="relative rounded-[30px] border border-[#f0e5df] bg-white p-3 shadow-[0_28px_80px_rgba(96,53,35,0.12)] sm:p-4">
            <div className="rounded-[22px] bg-[#fffaf7] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#f04424] text-white"><Soup size={19} /></span>
                  <div><p className="text-xs font-extrabold">Good morning, Rahul</p><p className="mt-0.5 text-[10px] text-[#938a84]">Here&apos;s your service today</p></div>
                </div>
                <span className="rounded-full bg-[#f1f3eb] px-2.5 py-1 text-[9px] font-bold text-[#697b4f]">● All on track</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Active customers', value: '84', icon: Users },
                  { label: 'Today’s tiffins', value: '126', icon: Soup },
                  { label: 'To deliver', value: '18', icon: ClipboardList },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-2xl border border-[#f1e8e2] bg-white p-3 sm:p-3.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[#fff0e9] text-[#f04424]"><Icon size={15} /></span>
                    <p className="mt-3 text-xl font-extrabold tracking-tight">{value}</p>
                    <p className="mt-0.5 text-[9px] font-medium leading-4 text-[#938a84] sm:text-[10px]">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl border border-[#f1e8e2] bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div><p className="text-xs font-extrabold">Today&apos;s delivery list</p><p className="mt-0.5 text-[10px] text-[#938a84]">Lunch · 12:30 PM</p></div>
                  <span className="rounded-lg bg-[#fff0e9] px-2.5 py-1.5 text-[9px] font-bold text-[#e45435]">View all <ArrowRight size={11} className="ml-1 inline" /></span>
                </div>
                {[
                  ['Aarav Mehta', '2 tiffins · Civil Lines', 'Delivered'],
                  ['Meera Kapoor', '1 tiffin · Model Town', 'On the way'],
                  ['Kabir Singh', '1 tiffin · Green Park', 'Preparing'],
                ].map(([name, detail, status], index) => (
                  <div key={name} className={`flex items-center gap-2.5 py-2.5 ${index ? 'border-t border-[#f5efeb]' : ''}`}>
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${index === 1 ? 'bg-[#f1f3eb] text-[#68794f]' : 'bg-[#fff0e9] text-[#d65335]'}`}>{name.split(' ').map((part) => part[0]).join('')}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold">{name}</p><p className="mt-0.5 truncate text-[9px] text-[#938a84]">{detail}</p></div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold ${index === 0 ? 'bg-[#eff3e9] text-[#65784d]' : 'bg-[#fff5e7] text-[#a36b2e]'}`}>{status}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#f04424] p-4 text-white">
                <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-white/15"><ArrowDownLeft size={18} /></span><div><p className="text-[10px] font-medium text-white/75">Collected this month</p><p className="mt-0.5 text-lg font-extrabold">₹1,24,500</p></div></div>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-bold">+12.8%</span>
              </div>
            </div>
          </div>
          <div className="absolute -left-5 top-[24%] hidden items-center gap-2.5 rounded-2xl border border-[#f0e5df] bg-white px-3.5 py-3 shadow-[0_12px_30px_rgba(96,53,35,0.12)] sm:flex">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#f1f3eb] text-[#68794f]"><CalendarCheck size={16} /></span>
            <div><p className="text-[9px] font-bold">Menu published</p><p className="mt-0.5 text-[8px] text-[#938a84]">Customers are in the loop</p></div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#f0e5df] bg-white">
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-6 px-5 py-8 text-center sm:grid-cols-4 md:px-8">
          {[
            ['01', 'One clear workspace'],
            ['02', 'Less manual follow-up'],
            ['03', 'Transparent customer records'],
            ['04', 'More confident planning'],
          ].map(([number, text]) => <div key={number} className="flex items-center justify-center gap-3 text-left"><span className="text-xs font-extrabold text-[#f04424]">{number}</span><span className="max-w-[130px] text-xs font-semibold leading-5 text-[#5f5853]">{text}</span></div>)}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-[620px] text-center">
          <span className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#f04424]">Your day, made simpler</span>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-0.055em] sm:text-4xl">All the moving parts. <span className="text-[#f04424]">One less thing to worry about.</span></h2>
          <p className="mt-4 text-sm leading-6 text-[#77716e] sm:text-base">Thoughtful tools for the real, everyday work behind a tiffin service.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }, index) => (
            <article key={title} className="group rounded-[22px] border border-[#f0e5df] bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-[#f3c2b3] hover:shadow-[0_16px_38px_rgba(96,53,35,0.08)] md:p-6">
              <div className={`flex size-11 items-center justify-center rounded-[15px] ${index === 2 ? 'bg-[#f1f3eb] text-[#697b4f]' : 'bg-[#fff0e9] text-[#f04424]'} transition group-hover:scale-105`}><Icon size={21} /></div>
              <h3 className="mt-5 text-base font-extrabold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#77716e]">{body}</p>
              <a href="#how-it-works" className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#f04424]">Learn more <ArrowRight size={13} className="transition group-hover:translate-x-1" /></a>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-[#fff1e9]">
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#f04424]">A smoother rhythm</span>
            <h2 className="mt-4 max-w-lg text-3xl font-extrabold leading-tight tracking-[-0.055em] sm:text-4xl">From first subscription to the last delivery.</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#77716e]">Set up your plans, share the menu, prepare from one dependable order list, and keep every bill clear. The everyday essentials, in a flow that makes sense.</p>
            <Link href="/sign-up" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#f04424] hover:gap-3">Start organizing your service <ArrowRight size={16} /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { n: '01', title: 'Set up your service', body: 'Add your business, customers, and meal plans.', icon: LayoutDashboard },
              { n: '02', title: 'Share what’s cooking', body: 'Publish menus and keep meal choices visible.', icon: Soup },
              { n: '03', title: 'Plan each delivery', body: 'Collect orders and record completed deliveries.', icon: PackageCheck },
              { n: '04', title: 'Close the month clearly', body: 'Review bills, skips, payments, and balances.', icon: CreditCard },
            ].map(({ n, title, body, icon: Icon }) => (
              <div key={n} className="rounded-[20px] border border-[#f2dfd4] bg-white p-5">
                <div className="flex items-center justify-between"><span className="text-xs font-extrabold tracking-wider text-[#e87759]">{n}</span><Icon size={19} className="text-[#f04424]" /></div>
                <h3 className="mt-5 text-sm font-extrabold">{title}</h3><p className="mt-2 text-xs leading-5 text-[#77716e]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="for-everyone" className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-24">
        <div className="mb-10 text-center"><span className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#f04424]">Made for both sides of the table</span><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] sm:text-4xl">A better experience, for everyone.</h2></div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="relative overflow-hidden rounded-[26px] bg-[#f04424] p-7 text-white md:p-9">
            <span className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-white/15"><LayoutDashboard size={23} /></span>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">For owners</p>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight">Run the service, not the spreadsheet.</h3>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/80">Get a clear view of customers, active plans, daily preparation, deliveries, and collections.</p>
            <ul className="mt-6 grid gap-2 text-xs font-semibold sm:grid-cols-2">{['Customer management', 'Daily order planning', 'Delivery tracking', 'Bills & payments'].map((text) => <li key={text} className="flex items-center gap-2"><Check size={14} className="text-[#ffd28c]" />{text}</li>)}</ul>
            <Link href="/sign-up" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-extrabold text-[#d93e23] transition hover:bg-[#fff1e9]">Create an owner account <ArrowRight size={15} /></Link>
            <Soup className="absolute -bottom-8 -right-7 size-44 rotate-[-18deg] text-white/[0.08]" />
          </article>
          <article className="relative overflow-hidden rounded-[26px] border border-[#f0e5df] bg-white p-7 md:p-9">
            <span className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-[#fff0e9] text-[#f04424]"><Soup size={23} /></span>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#f04424]">For customers</p>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight">Your meals, your way.</h3>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#77716e]">See the menu, manage your subscription, skip a meal in time, and know exactly where your bill stands.</p>
            <ul className="mt-6 grid gap-2 text-xs font-semibold text-[#55504c] sm:grid-cols-2">{['Browse available meal plans', 'Skip before cutoff', 'See delivery history', 'Track bills & payments'].map((text) => <li key={text} className="flex items-center gap-2"><Check size={14} className="text-[#73905a]" />{text}</li>)}</ul>
            <Link href="/sign-up" className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[#eadbd3] bg-white px-4 py-3 text-xs font-extrabold text-[#3d3733] transition hover:border-[#f0b5a2] hover:text-[#f04424]">Join your tiffin service <ArrowRight size={15} /></Link>
            <Sparkles className="absolute -bottom-8 -right-7 size-40 rotate-[-15deg] text-[#f04424]/[0.07]" />
          </article>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-8 md:pb-24">
        <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[30px] bg-[#211b18] px-6 py-12 text-center text-white md:px-12 md:py-16">
          <span className="pointer-events-none absolute -right-12 -top-32 size-72 rounded-full border border-white/[0.08]" />
          <span className="pointer-events-none absolute -left-16 -bottom-40 size-72 rounded-full bg-[#f04424]/25 blur-2xl" />
          <div className="relative z-10 mx-auto max-w-[650px]">
            <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-white/10 text-[#ff9a7c]"><Menu size={21} /></span>
            <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">Make room for a smoother day.</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/65">Bring the moving parts of your tiffin service into one clear, welcoming workspace.</p>
            <Link href="/sign-up" className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-[#f04424] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#ff5c3a]">Get started <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#f0e5df] bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <Link href="/" className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-xl bg-[#f04424] text-white"><Soup size={18} /></span><span className="text-sm font-extrabold tracking-tight">Tiffin<span className="text-[#f04424]">Track</span></span></Link>
          <p className="text-xs text-[#8a817c]">A little more ease in every day. © {new Date().getFullYear()} TiffinTrack.</p>
          <div className="flex gap-5 text-xs font-semibold text-[#6f6965]"><Link href="/sign-in" className="hover:text-[#f04424]">Sign in</Link><Link href="/sign-up" className="hover:text-[#f04424]">Create account</Link><a href="#features" className="hover:text-[#f04424]">Features</a></div>
        </div>
      </footer>
    </main>
  )
}
