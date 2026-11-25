import { randomBytes, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { ObjectId, type Collection, type Document } from 'mongodb'
import { auth } from '@/lib/auth'
import { connectMongo } from '@/lib/mongodb'

type AppUser = {
  id: string
  name: string
  email: string
  role?: string
  ownerId?: string
}
type Data = Record<string, unknown>
type MongoDocument = Document & { _id?: string | ObjectId }

const json = (body: unknown, status = 200) => NextResponse.json(body, { status })
const isOwner = (user: AppUser) => user.role === 'owner'
const isCustomer = (user: AppUser) => user.role !== 'owner'
const ownerFor = (user: AppUser) => (isOwner(user) ? user.id : user.ownerId)
const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const asAmount = (value: unknown) => (typeof value === 'number' ? value : Number(value))
const isDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = Date.parse(`${value}T12:00:00Z`)
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value
}
const allowedMeals = ['lunch', 'dinner', 'both']
const dbId = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : id)
const apiError = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.startsWith('MongoDB is not configured.')
    ? error.message
    : fallback

async function readBody(request: Request): Promise<Data | null> {
  try {
    const body: unknown = await request.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Data : null
  } catch {
    return null
  }
}
const localDate = (timezone = 'Asia/Kolkata') => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

async function getUser(request: Request): Promise<AppUser | null> {
  const session = await auth.api.getSession({ headers: request.headers })
  return session?.user ? (session.user as AppUser) : null
}

async function collection(name: string): Promise<Collection<MongoDocument>> {
  const db = await connectMongo()
  return db.collection<MongoDocument>(name)
}

function scope(user: AppUser): Data | null {
  const ownerId = ownerFor(user)
  if (!ownerId) return null
  return isOwner(user) ? { ownerId: user.id } : { ownerId, customerId: user.id }
}

async function initializeBusiness(user: AppUser, businessName: string) {
  const businesses = await collection('businesses')
  const existing = await businesses.findOne({ ownerId: user.id })
  if (existing) return existing
  const business = {
    _id: randomUUID(),
    ownerId: user.id,
    name: businessName || `${user.name}'s Tiffin Service`,
    inviteCode: randomBytes(4).toString('hex').toUpperCase(),
    lunchCutoff: '10:00',
    dinnerCutoff: '17:00',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await businesses.insertOne(business)
  return business
}

async function handleAction(user: AppUser, body: Data) {
  const action = asText(body.action)
  if (action === 'initialize-business') {
    if (!isOwner(user)) return json({ error: 'Only an owner can set up a business.' }, 403)
    return json(await initializeBusiness(user, asText(body.name)))
  }

  if (action === 'join-business') {
    if (!isCustomer(user)) return json({ error: 'Owner accounts cannot join another business.' }, 403)
    const code = asText(body.code).toUpperCase()
    if (!code) return json({ error: 'Enter a business invite code.' }, 400)
    const businesses = await collection('businesses')
    const business = await businesses.findOne({ inviteCode: code })
    if (!business) return json({ error: 'That invite code was not found.' }, 404)
    const users = await collection('user')
    await users.updateOne({ _id: dbId(user.id) }, { $set: { ownerId: business.ownerId, updatedAt: new Date() } })
    const profiles = await collection('customerProfiles')
    const profile = await profiles.findOne({ ownerId: business.ownerId, email: user.email.toLowerCase() })
    if (profile) {
      await profiles.updateOne({ _id: profile._id }, { $set: { userId: user.id, updatedAt: new Date().toISOString() } })
      const related = ['subscriptions', 'orders', 'skips', 'bills', 'payments']
      for (const name of related) {
        await (await collection(name)).updateMany(
          { ownerId: business.ownerId, customerId: profile._id },
          { $set: { customerId: user.id, updatedAt: new Date().toISOString() } },
        )
      }
    }
    return json({ ok: true, businessName: business.name })
  }

  if (action === 'update-profile') {
    if (!isCustomer(user)) return json({ error: 'Owner profiles are managed in business settings.' }, 403)
    const name = asText(body.name)
    const phone = asText(body.phone)
    const address = asText(body.address)
    if (!name) return json({ error: 'Your name cannot be empty.' }, 400)
    await (await collection('user')).updateOne(
      { _id: dbId(user.id) },
      { $set: { name, phone, address, updatedAt: new Date() } },
    )
    return json({ ok: true })
  }

  if (action === 'skip-meal') {
    if (!isCustomer(user)) return json({ error: 'Meal skips are available to customer accounts.' }, 403)
    const subscriptionId = asText(body.subscriptionId)
    const date = asText(body.date)
    const mealType = asText(body.mealType)
    if (!isDate(date) || !['lunch', 'dinner'].includes(mealType)) {
      return json({ error: 'Choose a valid date and meal.' }, 400)
    }
    const ownerId = ownerFor(user)
    if (!ownerId) return json({ error: 'Join a tiffin service before skipping a meal.' }, 409)
    const subscription = await (await collection('subscriptions')).findOne({
      _id: subscriptionId,
      ownerId,
      customerId: user.id,
      status: 'active',
    })
    if (!subscription || ![mealType, 'both'].includes(String(subscription.mealType))) {
      return json({ error: 'An active subscription for this meal was not found.' }, 404)
    }
    const business = await (await collection('businesses')).findOne({ ownerId })
    const timezone = asText(business?.timezone) || 'Asia/Kolkata'
    if (date < localDate(timezone)) return json({ error: 'Past meals cannot be skipped.' }, 400)
    if (date < String(subscription.startDate) || (subscription.endDate && date > String(subscription.endDate))) {
      return json({ error: 'This meal date is outside your subscription period.' }, 400)
    }
    if (date === localDate(timezone)) {
      const cutoff = asText(mealType === 'lunch' ? business?.lunchCutoff : business?.dinnerCutoff) ||
        (mealType === 'lunch' ? '10:00' : '17:00')
      const now = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date())
      if (now >= cutoff) return json({ error: `The ${mealType} skip cutoff (${cutoff}) has passed.` }, 409)
    }
    const skip = {
      _id: `${subscriptionId}-${date}-${mealType}`,
      ownerId,
      customerId: user.id,
      subscriptionId,
      date,
      mealType,
      status: 'approved',
      createdAt: new Date().toISOString(),
    }
    const existingOrder = await (await collection('orders')).findOne({
      ownerId,
      customerId: user.id,
      subscriptionId,
      date,
      mealType,
    })
    if (existingOrder?.status === 'delivered') {
      return json({ error: 'This meal has already been delivered and cannot be skipped.' }, 409)
    }
    try {
      await (await collection('skips')).insertOne(skip)
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return json({ error: 'This meal is already marked as skipped.' }, 409)
      throw error
    }
    if (existingOrder) {
      await (await collection('orders')).deleteOne({ _id: existingOrder._id, ownerId })
    }
    return json(skip, 201)
  }

  if (action === 'generate-orders') {
    if (!isOwner(user)) return json({ error: 'Only an owner can generate delivery orders.' }, 403)
    const date = asText(body.date)
    if (!isDate(date)) return json({ error: 'Choose a valid order date.' }, 400)
    const subscriptions = await (await collection('subscriptions'))
      .find({ ownerId: user.id, status: 'active', startDate: { $lte: date } })
      .toArray()
    const [skips, menus, profiles, users] = await Promise.all([
      (await collection('skips')).find({ ownerId: user.id, date }).toArray(),
      (await collection('menus')).find({ ownerId: user.id, date }).toArray(),
      (await collection('customerProfiles')).find({ ownerId: user.id }).toArray(),
      (await collection('user')).find({ ownerId: user.id, role: 'customer' }, { projection: { name: 1, email: 1, address: 1 } }).toArray(),
    ])
    const customerMap = new Map<string, Data>()
    for (const customer of [...profiles, ...users]) customerMap.set(String(customer._id), customer)
    const operations = []
    for (const subscription of subscriptions) {
      if (subscription.endDate && subscription.endDate < date) continue
      const meals = subscription.mealType === 'both' ? ['lunch', 'dinner'] : [subscription.mealType]
      const customer = customerMap.get(String(subscription.customerId))
      for (const mealType of meals) {
        if (skips.some((skip) => skip.customerId === subscription.customerId && skip.mealType === mealType && skip.status === 'approved')) continue
        const menu = menus.find((item) => item.mealType === mealType)
        const orderId = `${subscription._id}-${date}-${mealType}`
        operations.push({
          updateOne: {
            filter: { _id: orderId, ownerId: user.id },
            update: {
              $setOnInsert: {
                _id: orderId,
                ownerId: user.id,
                customerId: subscription.customerId,
                customerName: customer?.name || subscription.customerName || 'Customer',
                customerEmail: customer?.email || '',
                deliveryAddress: subscription.deliveryAddress || customer?.address || '',
                subscriptionId: subscription._id,
                planId: subscription.planId,
                date,
                mealType,
                menuItems: menu?.items || [],
                amount: subscription.pricePerMeal || 0,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            },
            upsert: true,
          },
        })
      }
    }
    const orders = await collection('orders')
    if (operations.length) await orders.bulkWrite(operations, { ordered: false })
    return json({ created: operations.length, date })
  }

  if (action === 'generate-bill') {
    if (!isOwner(user)) return json({ error: 'Only an owner can generate bills.' }, 403)
    const customerId = asText(body.customerId)
    const subscriptionId = asText(body.subscriptionId)
    const month = asText(body.month)
    if (!customerId || !subscriptionId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return json({ error: 'Choose a customer, subscription, and billing month.' }, 400)
    }
    const subscriptions = await collection('subscriptions')
    const subscription = await subscriptions.findOne({ _id: subscriptionId, ownerId: user.id, customerId })
    if (!subscription) return json({ error: 'Subscription not found for this customer.' }, 404)
    const plan = await (await collection('plans')).findOne({ _id: subscription.planId, ownerId: user.id })
    if (!plan) return json({ error: 'The subscription plan could not be found.' }, 404)
    const start = `${month}-01`
    const nextMonth = new Date(`${month}-01T12:00:00Z`)
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
    const end = nextMonth.toISOString().slice(0, 10)
    const orders = await (await collection('orders'))
      .find({ ownerId: user.id, customerId, subscriptionId, date: { $gte: start, $lt: end }, status: 'delivered' })
      .toArray()
    const skips = await (await collection('skips'))
      .find({ ownerId: user.id, customerId, subscriptionId, date: { $gte: start, $lt: end }, status: 'approved' })
      .toArray()
    const [existingBills, advances] = await Promise.all([
      (await collection('bills')).find({ ownerId: user.id, customerId }).toArray(),
      (await collection('payments')).find({ ownerId: user.id, customerId, billId: null }).toArray(),
    ])
    const monthly = plan.billingType === 'monthly'
    const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
    const activeStart = subscription.startDate > start ? subscription.startDate : start
    const activeEnd = subscription.endDate && subscription.endDate < end
      ? subscription.endDate
      : new Date(`${end}T12:00:00Z`).toISOString().slice(0, 10)
    const activeDays = activeStart <= activeEnd
      ? Math.floor((Date.parse(`${activeEnd}T12:00:00Z`) - Date.parse(`${activeStart}T12:00:00Z`)) / 86400000) + 1
      : 0
    const grossAmount = monthly
      ? Math.round(Number(plan.price) * Math.min(daysInMonth, activeDays) / daysInMonth)
      : orders.reduce((sum, order) => sum + Number(order.amount || 0), 0)
    const deductionRate = monthly
      ? Number(plan.price) / Math.max(1, Number(plan.includedMeals) || 26)
      : 0
    const skipDeduction = monthly ? Math.min(grossAmount, Math.round(skips.length * deductionRate)) : 0
    const unusedAdvance = Math.max(
      0,
      advances.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) -
        existingBills.reduce((sum, existingBill) => sum + Number(existingBill.advanceAdjustment || 0), 0),
    )
    const advanceAdjustment = Math.min(grossAmount - skipDeduction, unusedAdvance)
    const netAmount = Math.max(0, grossAmount - skipDeduction - advanceAdjustment)
    const bill = {
      _id: `${subscriptionId}-${month}`,
      ownerId: user.id,
      customerId,
      subscriptionId,
      planId: plan._id,
      planName: plan.name,
      billingMonth: month,
      grossAmount,
      skipDeduction,
      advanceAdjustment,
      netAmount,
      paymentStatus: netAmount === 0 ? 'paid' : 'pending',
      paidAmount: 0,
      deliveredMeals: orders.length,
      skippedMeals: skips.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    try {
      await (await collection('bills')).insertOne(bill)
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return json({ error: 'A bill already exists for this subscription and month.' }, 409)
      throw error
    }
    return json(bill, 201)
  }

  return json({ error: 'Unknown action.' }, 400)
}

async function getResource(user: AppUser, resource: string, search: URLSearchParams) {
  const ownerId = ownerFor(user)
  if (resource === 'business') {
    if (isOwner(user)) {
      const business = await (await collection('businesses')).findOne({ ownerId: user.id })
      return json(business)
    }
    if (!ownerId) return json(null)
    const business = await (await collection('businesses')).findOne(
      { ownerId },
      { projection: { _id: 1, ownerId: 1, name: 1, lunchCutoff: 1, dinnerCutoff: 1, currency: 1 } },
    )
    return json(business)
  }
  if (resource === 'overview') {
    if (!ownerId) return json({ needsBusiness: true, counts: {} })
    const db = await connectMongo()
    const date = localDate()
    const month = date.slice(0, 7)
    const orderQuery = isOwner(user) ? { ownerId, date } : { ownerId, customerId: user.id, date }
    const todayOrders = await db.collection('orders').find(orderQuery).toArray()
    const [customers, subscriptions, bills, payments] = await Promise.all([
      isOwner(user)
        ? db.collection('user').find({ role: 'customer', ownerId }, { projection: { _id: 1 } }).toArray()
        : Promise.resolve([]),
      db.collection('subscriptions').countDocuments(isOwner(user) ? { ownerId, status: 'active' } : { ownerId, customerId: user.id, status: 'active' }),
      db.collection('bills').find(isOwner(user) ? { ownerId, paymentStatus: { $ne: 'paid' } } : { ownerId, customerId: user.id, paymentStatus: { $ne: 'paid' } }).toArray(),
      db.collection('payments').find(isOwner(user) ? { ownerId, date: { $regex: `^${month}` } } : { ownerId, customerId: user.id, date: { $regex: `^${month}` } }).toArray(),
    ])
    const customerProfiles = isOwner(user)
      ? await db.collection('customerProfiles').find({ ownerId }, { projection: { userId: 1 } }).toArray()
      : []
    const linkedCustomerIds = new Set(customers.map((customer) => String(customer._id)))
    const uniqueCustomerCount = customers.length + customerProfiles.filter(
      (profile) => !profile.userId || !linkedCustomerIds.has(String(profile.userId)),
    ).length
    return json({
      date,
      counts: {
        customers: uniqueCustomerCount,
        activeSubscriptions: subscriptions,
        todayOrders: todayOrders.length,
        pendingDeliveries: todayOrders.filter((order) => order.status === 'pending').length,
        deliveredToday: todayOrders.filter((order) => order.status === 'delivered').length,
        pendingAmount: bills.reduce((sum, bill) => sum + Math.max(0, Number(bill.netAmount) - Number(bill.paidAmount || 0)), 0),
        monthlyRevenue: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      },
    })
  }
  if (!ownerId) return json([])
  if (resource === 'reports') {
    if (!isOwner(user)) return json({ error: 'Only an owner can view business reports.' }, 403)
    const firstMonth = new Date()
    firstMonth.setDate(1)
    firstMonth.setMonth(firstMonth.getMonth() - 5)
    const from = `${firstMonth.getFullYear()}-${String(firstMonth.getMonth() + 1).padStart(2, '0')}-01`
    const [payments, orders, skips] = await Promise.all([
      (await collection('payments')).find({ ownerId, date: { $gte: from } }).toArray(),
      (await collection('orders')).find({ ownerId, date: { $gte: from } }).toArray(),
      (await collection('skips')).find({ ownerId, date: { $gte: from }, status: 'approved' }).toArray(),
    ])
    const months = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date()
      monthDate.setDate(1)
      monthDate.setMonth(monthDate.getMonth() - (5 - index))
      const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
      return {
        month,
        revenue: payments.filter((item) => String(item.date).startsWith(month)).reduce((sum, item) => sum + Number(item.amount || 0), 0),
        deliveries: orders.filter((item) => String(item.date).startsWith(month) && item.status === 'delivered').length,
        skips: skips.filter((item) => String(item.date).startsWith(month)).length,
      }
    })
    return json(months)
  }
  if (resource === 'defaulters') {
    if (!isOwner(user)) return json({ error: 'Only an owner can view pending balances.' }, 403)
    const [bills, profiles, accounts] = await Promise.all([
      (await collection('bills')).find({ ownerId, paymentStatus: { $ne: 'paid' } }).toArray(),
      (await collection('customerProfiles')).find({ ownerId }).toArray(),
      (await collection('user')).find({ ownerId, role: 'customer' }, { projection: { name: 1, email: 1 } }).toArray(),
    ])
    const customers = new Map<string, Data>()
    for (const customer of [...profiles, ...accounts]) customers.set(String(customer._id), customer)
    return json(
      bills.map((bill) => ({
        ...bill,
        customerName: customers.get(String(bill.customerId))?.name || 'Customer',
        customerEmail: customers.get(String(bill.customerId))?.email || '',
        amountDue: Math.max(0, Number(bill.netAmount) - Number(bill.paidAmount || 0)),
      })).filter((bill) => Number(bill.amountDue) > 0).sort((a, b) => Number(b.amountDue) - Number(a.amountDue)).slice(0, 10),
    )
  }
  if (resource === 'customers') {
    if (!isOwner(user)) return json({ error: 'Only an owner can view the customer directory.' }, 403)
    const [profiles, accounts] = await Promise.all([
      (await collection('customerProfiles')).find({ ownerId: user.id }).sort({ name: 1 }).toArray(),
      (await collection('user')).find({ ownerId: user.id, role: 'customer' }, { projection: { name: 1, email: 1, phone: 1, address: 1, createdAt: 1 } }).sort({ name: 1 }).toArray(),
    ])
    const accountIds = new Set(accounts.map((item) => String(item._id)))
    return json([
      ...accounts.map((item) => ({ ...item, _id: String(item._id), linked: true })),
      ...profiles.filter((item) => !item.userId || !accountIds.has(String(item.userId))).map((item) => ({ ...item, linked: Boolean(item.userId) })),
    ])
  }
  const collectionNames = ['plans', 'menus', 'subscriptions', 'skips', 'orders', 'bills', 'payments']
  if (!collectionNames.includes(resource)) return json({ error: 'Unknown resource.' }, 404)
  const query: Data = { ownerId }
  if (!isOwner(user)) query.customerId = user.id
  if (resource === 'plans' && !isOwner(user)) query.active = true
  if (resource === 'menus') {
    const date = search.get('date')
    if (date && isDate(date)) query.date = date
  }
  const docs = await (await collection(resource)).find(query as Document).sort({ date: -1, createdAt: -1 }).limit(500).toArray()
  if (isOwner(user) && ['skips', 'bills', 'payments'].includes(resource)) {
    const [profiles, accounts] = await Promise.all([
      (await collection('customerProfiles')).find({ ownerId }).toArray(),
      (await collection('user')).find({ ownerId, role: 'customer' }, { projection: { name: 1 } }).toArray(),
    ])
    const customers = new Map<string, string>()
    for (const customer of [...profiles, ...accounts]) customers.set(String(customer._id), asText(customer.name))
    return json(docs.map((doc) => ({ ...doc, customerName: customers.get(String(doc.customerId)) || 'Customer' })))
  }
  if (!isOwner(user) && ['skips', 'bills', 'payments'].includes(resource)) {
    return json(docs.map((doc) => ({ ...doc, customerName: user.name })))
  }
  return json(docs)
}

export async function GET(request: Request) {
  try {
    await connectMongo()
    const user = await getUser(request)
    if (!user) return json({ error: 'Sign in to continue.' }, 401)
    const resource = new URL(request.url).searchParams.get('resource') || 'overview'
    return await getResource(user, resource, new URL(request.url).searchParams)
  } catch (error) {
    console.error('GET /api/app failed:', error)
    return json({ error: apiError(error, 'Unable to load application data.') }, 500)
  }
}

export async function POST(request: Request) {
  try {
    await connectMongo()
    const user = await getUser(request)
    if (!user) return json({ error: 'Sign in to continue.' }, 401)
    const body = await readBody(request)
    if (!body) return json({ error: 'Request body must be a valid JSON object.' }, 400)
    if (body.action) return await handleAction(user, body)
    const resource = asText(body.resource)
    const ownerId = ownerFor(user)
    const data = (body.data || {}) as Data
    if (resource === 'business') {
      if (!isOwner(user)) return json({ error: 'Only an owner can update business settings.' }, 403)
      const name = asText(data.name)
      const lunchCutoff = asText(data.lunchCutoff)
      const dinnerCutoff = asText(data.dinnerCutoff)
      const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/
      if (!name || !validTime.test(lunchCutoff) || !validTime.test(dinnerCutoff)) {
        return json({ error: 'Enter a business name and valid meal cutoff times.' }, 400)
      }
      const business = await initializeBusiness(user, name)
      await (await collection('businesses')).updateOne(
        { _id: business._id },
        { $set: { name, lunchCutoff, dinnerCutoff, updatedAt: new Date().toISOString() } },
      )
      return json({ ...business, name, lunchCutoff, dinnerCutoff })
    }
    if (!ownerId) return json({ error: 'Join a tiffin service before using this feature.' }, 409)

    let name = ''
    let document: Data = {}
    if (resource === 'customers') {
      if (!isOwner(user)) return json({ error: 'Only an owner can add customers.' }, 403)
      name = asText(data.name)
      const email = asText(data.email).toLowerCase()
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a customer name and valid email.' }, 400)
      const existing = await (await collection('customerProfiles')).findOne({ ownerId, email })
      if (existing) return json({ error: 'A customer with this email already exists.' }, 409)
      const linkedAccount = await (await collection('user')).findOne({ ownerId, email, role: 'customer' }, { projection: { _id: 1 } })
      if (linkedAccount) return json({ error: 'This customer already has a linked account.' }, 409)
      document = { _id: randomUUID(), ownerId, name, email, phone: asText(data.phone), address: asText(data.address), userId: null }
    } else if (resource === 'plans') {
      if (!isOwner(user)) return json({ error: 'Only an owner can manage meal plans.' }, 403)
      name = asText(data.name)
      const price = asAmount(data.price)
      const billingType = asText(data.billingType)
      const mealType = asText(data.mealType)
      if (!name || !Number.isFinite(price) || price <= 0 || !allowedMeals.includes(mealType) || !['monthly', 'per_meal'].includes(billingType)) return json({ error: 'Enter a plan name, valid price, billing style, and meal type.' }, 400)
      document = { _id: randomUUID(), ownerId, name, description: asText(data.description), mealType, billingType, price, includedMeals: Math.max(1, Math.round(asAmount(data.includedMeals) || 26)), active: true }
    } else if (resource === 'menus') {
      if (!isOwner(user)) return json({ error: 'Only an owner can manage menus.' }, 403)
      const date = asText(data.date)
      const mealType = asText(data.mealType)
      const items = Array.isArray(data.items) ? data.items.map(asText).filter(Boolean).slice(0, 30) : asText(data.items).split(',').map((item) => item.trim()).filter(Boolean).slice(0, 30)
      if (!isDate(date) || !['lunch', 'dinner'].includes(mealType) || !items.length) return json({ error: 'Choose a date, meal, and at least one menu item.' }, 400)
      document = { _id: randomUUID(), ownerId, date, mealType, items, category: data.category === 'non-veg' ? 'non-veg' : 'veg', imageUrl: asText(data.imageUrl) }
    } else if (resource === 'subscriptions') {
      const planId = asText(data.planId)
      const plan = await (await collection('plans')).findOne({ _id: planId, ownerId, active: true })
      if (!plan) return json({ error: 'Choose an active meal plan.' }, 400)
      const customerId = isOwner(user) ? asText(data.customerId) : user.id
      if (!customerId) return json({ error: 'Choose a customer.' }, 400)
      if (isOwner(user)) {
        const [account, profile] = await Promise.all([
          (await collection('user')).findOne({ _id: dbId(customerId), ownerId, role: 'customer' }),
          (await collection('customerProfiles')).findOne({ _id: customerId, ownerId }),
        ])
        if (!account && !profile) return json({ error: 'Customer not found in your business.' }, 404)
      }
      const startDate = asText(data.startDate)
      if (!isDate(startDate)) return json({ error: 'Choose a valid subscription start date.' }, 400)
        const duplicate = await (await collection('subscriptions')).findOne({
          ownerId,
          customerId,
          planId,
          status: { $in: ['active', 'pending', 'paused'] },
        })
        if (duplicate) return json({ error: 'This customer already has an open subscription for that plan.' }, 409)
        const [account, profile] = isOwner(user)
          ? await Promise.all([
              (await collection('user')).findOne({ _id: dbId(customerId), ownerId, role: 'customer' }, { projection: { name: 1, address: 1 } }),
              (await collection('customerProfiles')).findOne({ _id: customerId, ownerId }),
            ])
          : [null, null]
      document = {
        _id: randomUUID(), ownerId, customerId, planId, planName: plan.name,
          customerName: asText(account?.name || profile?.name || data.customerName) || user.name,
        mealType: allowedMeals.includes(asText(data.mealType)) ? asText(data.mealType) : plan.mealType,
        pricePerMeal: plan.billingType === 'per_meal' ? plan.price : Math.round(Number(plan.price) / Math.max(1, Number(plan.includedMeals) || 26)),
        startDate, endDate: '', deliveryAddress: asText(data.deliveryAddress),
        status: isOwner(user) ? (data.status === 'paused' ? 'paused' : 'active') : 'pending',
        createdAt: new Date().toISOString(),
      }
    } else if (resource === 'payments') {
      if (!isOwner(user)) return json({ error: 'Payments must be recorded by the tiffin service owner.' }, 403)
      const customerId = asText(data.customerId)
      const amount = asAmount(data.amount)
      const date = asText(data.date)
      if (!customerId || !Number.isFinite(amount) || amount <= 0 || !isDate(date)) return json({ error: 'Enter a customer, valid payment amount, and date.' }, 400)
      const customerExists = await (await collection('user')).findOne({ _id: dbId(customerId), ownerId, role: 'customer' }) ||
        await (await collection('customerProfiles')).findOne({ _id: customerId, ownerId })
      if (!customerExists) return json({ error: 'Customer not found in your business.' }, 404)
      const billId = asText(data.billId)
      if (billId && !(await (await collection('bills')).findOne({ _id: billId, ownerId, customerId }))) return json({ error: 'Bill not found for this customer.' }, 404)
      document = { _id: randomUUID(), ownerId, customerId, billId: billId || null, amount, paymentMethod: asText(data.paymentMethod) || 'Cash', date, note: asText(data.note), createdAt: new Date().toISOString() }
    } else {
      return json({ error: 'This resource cannot be created here.' }, 404)
    }
    const result = await (await collection(resource === 'customers' ? 'customerProfiles' : resource)).insertOne(document as Document)
    if (resource === 'payments' && document.billId) {
      const billId = String(document.billId)
      const payments = await (await collection('payments')).find({ ownerId, billId }).toArray()
      const bill = await (await collection('bills')).findOne({ _id: billId, ownerId })
      if (bill) {
        const paidAmount = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
        const paymentStatus = paidAmount >= Number(bill.netAmount) ? 'paid' : paidAmount ? 'partial' : 'pending'
        await (await collection('bills')).updateOne(
          { _id: billId, ownerId },
          { $set: { paidAmount, paymentStatus, updatedAt: new Date().toISOString() } },
        )
      }
    }
    return json({ ...document, _id: String(result.insertedId) }, 201)
  } catch (error) {
    console.error('POST /api/app failed:', error)
    return json({ error: apiError(error, 'Unable to save this record.') }, 500)
  }
}

export async function PATCH(request: Request) {
  try {
    await connectMongo()
    const user = await getUser(request)
    if (!user) return json({ error: 'Sign in to continue.' }, 401)
    const body = await readBody(request)
    if (!body) return json({ error: 'Request body must be a valid JSON object.' }, 400)
    const resource = asText(body.resource)
    const id = asText(body.id)
    const data = (body.data || {}) as Data
    if (!id) return json({ error: 'Record id is required.' }, 400)
    if (resource === 'subscriptions' && isCustomer(user)) {
      if (!['active', 'paused', 'cancelled'].includes(asText(data.status))) {
        return json({ error: 'Choose a valid subscription status.' }, 400)
      }
      const ownerId = ownerFor(user)
      if (!ownerId) return json({ error: 'Join a tiffin service before managing subscriptions.' }, 409)
      const subscriptions = await collection('subscriptions')
      const existing = await subscriptions.findOne({ _id: id, ownerId, customerId: user.id })
      if (!existing) return json({ error: 'Subscription not found.' }, 404)
      const nextStatus = asText(data.status)
      const allowedTransition =
        (existing.status === 'active' && ['paused', 'cancelled'].includes(nextStatus)) ||
        (existing.status === 'paused' && ['active', 'cancelled'].includes(nextStatus))
      if (!allowedTransition) return json({ error: 'This subscription must be approved by the service owner before it can be changed.' }, 409)
      const result = await (await collection('subscriptions')).updateOne(
        { _id: id, ownerId, customerId: user.id },
        { $set: { status: nextStatus, updatedAt: new Date().toISOString() } },
      )
      if (!result.matchedCount) return json({ error: 'Subscription not found.' }, 404)
      return json({ ok: true })
    }
    if (!isOwner(user)) return json({ error: 'Only an owner can update business records.' }, 403)
    const ownerId = user.id
    const updates: Data = { updatedAt: new Date().toISOString() }
    if (resource === 'orders') {
      if (!['pending', 'delivered', 'skipped'].includes(asText(data.status))) return json({ error: 'Choose a valid delivery status.' }, 400)
      updates.status = asText(data.status)
      if (updates.status === 'delivered') updates.deliveredAt = new Date().toISOString()
    } else if (resource === 'subscriptions') {
      if (!['active', 'paused', 'cancelled'].includes(asText(data.status))) return json({ error: 'Choose a valid subscription status.' }, 400)
      updates.status = asText(data.status)
      if (data.endDate && isDate(asText(data.endDate))) updates.endDate = asText(data.endDate)
    } else if (resource === 'plans') {
      if (typeof data.active !== 'boolean') return json({ error: 'Choose whether this plan is active.' }, 400)
      updates.active = data.active
    } else if (resource === 'skips') {
      if (!['approved', 'rejected'].includes(asText(data.status))) return json({ error: 'Choose a valid skip status.' }, 400)
      updates.status = asText(data.status)
    } else {
      return json({ error: 'This record cannot be updated.' }, 404)
    }
    const result = await (await collection(resource)).updateOne({ _id: id, ownerId }, { $set: updates })
    if (!result.matchedCount) return json({ error: 'Record not found.' }, 404)
    return json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/app failed:', error)
    return json({ error: apiError(error, 'Unable to update this record.') }, 500)
  }
}

export async function DELETE(request: Request) {
  try {
    await connectMongo()
    const user = await getUser(request)
    if (!user) return json({ error: 'Sign in to continue.' }, 401)
    const body = await readBody(request)
    if (!body) return json({ error: 'Request body must be a valid JSON object.' }, 400)
    const resource = asText(body.resource)
    const id = asText(body.id)
    const ownerId = ownerFor(user)
    if (!ownerId || !id) return json({ error: 'Record id is required.' }, 400)
    if (['orders', 'bills', 'subscriptions'].includes(resource) && !isOwner(user)) return json({ error: 'Only an owner can remove this record.' }, 403)
    if (!['menus', 'plans', 'customers', 'payments'].includes(resource) || !isOwner(user)) return json({ error: 'This record cannot be removed.' }, 403)
    const collectionName = resource === 'customers' ? 'customerProfiles' : resource
    const targetCollection = await collection(collectionName)
    const target = await targetCollection.findOne({ _id: id, ownerId })
    if (!target) return json({ error: 'Record not found.' }, 404)
    if (resource === 'plans') {
      const activeSubscriptions = await (await collection('subscriptions')).countDocuments({ ownerId, planId: id })
      if (activeSubscriptions) return json({ error: 'This plan is used by subscriptions. Deactivate it instead.' }, 409)
    }
    if (resource === 'customers') {
      if (target.userId) return json({ error: 'This customer account is linked. Keep the profile to preserve their service history.' }, 409)
      const relatedSubscriptions = await (await collection('subscriptions')).countDocuments({ ownerId, customerId: id })
      if (relatedSubscriptions) return json({ error: 'This customer has service history and cannot be removed.' }, 409)
    }
    const result = await targetCollection.deleteOne({ _id: id, ownerId })
    if (!result.deletedCount) return json({ error: 'Record not found.' }, 404)
    if (resource === 'payments' && target.billId) {
      const billId = String(target.billId)
      const payments = await (await collection('payments')).find({ ownerId, billId }).toArray()
      const bill = await (await collection('bills')).findOne({ _id: billId, ownerId })
      if (bill) {
        const paidAmount = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
        const paymentStatus = paidAmount >= Number(bill.netAmount) ? 'paid' : paidAmount ? 'partial' : 'pending'
        await (await collection('bills')).updateOne(
          { _id: billId, ownerId },
          { $set: { paidAmount, paymentStatus, updatedAt: new Date().toISOString() } },
        )
      }
    }
    return json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/app failed:', error)
    return json({ error: apiError(error, 'Unable to delete this record.') }, 500)
  }
}
