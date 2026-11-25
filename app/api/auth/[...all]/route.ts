import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { connectMongo } from '@/lib/mongodb'

const handlers = toNextJsHandler(auth.handler)

async function handle(request: Request, method: 'GET' | 'POST') {
  try {
    await connectMongo()
    return await handlers[method](request)
  } catch (error) {
    console.error('Authentication request failed:', error)
    return Response.json(
      { error: 'Authentication is unavailable. Check the MongoDB Atlas connection and server configuration.' },
      { status: 503 },
    )
  }
}

export const GET = (request: Request) => handle(request, 'GET')
export const POST = (request: Request) => handle(request, 'POST')
