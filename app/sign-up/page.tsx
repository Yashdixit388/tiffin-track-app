import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { isMongoConfigured } from '@/lib/mongodb'

export default async function SignUpPage() {
  if (isMongoConfigured()) {
    const session = await auth.api.getSession({ headers: await headers() })
    if (session?.user) redirect('/dashboard')
  }
  return <AuthForm mode="sign-up" />
}
