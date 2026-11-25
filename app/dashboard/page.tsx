import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { isMongoConfigured } from '@/lib/mongodb'
import { PlatformApp } from '@/components/platform-app'

export default async function DashboardPage() {
  if (!isMongoConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff9f5] px-5">
        <section className="max-w-lg rounded-3xl border border-[#f0e5df] bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold">Connect MongoDB Atlas to continue</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Add <code className="rounded bg-[#fff1e9] px-1.5 py-0.5">MONGODB_URI</code> and
            optionally <code className="rounded bg-[#fff1e9] px-1.5 py-0.5">MONGODB_DB</code> to
            your environment, then restart the app.
          </p>
          <Link href="/" className="mt-5 inline-block text-sm font-bold text-primary">Back to home</Link>
        </section>
      </main>
    )
  }
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const user = session.user as typeof session.user & { role?: string; ownerId?: string; phone?: string; address?: string }
  return (
    <PlatformApp
      role={user.role === 'owner' ? 'owner' : 'customer'}
      userName={user.name}
      hasBusiness={Boolean(user.ownerId)}
      phone={user.phone || ''}
      address={user.address || ''}
    />
  )
}
