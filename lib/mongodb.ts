import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const options = {}

declare global {
  var tiffinMongoClient: MongoClient | undefined
}

export const mongoClient = globalThis.tiffinMongoClient ?? new MongoClient(
  uri || 'mongodb://127.0.0.1:27017/tiffintrack',
  options,
)

if (process.env.NODE_ENV !== 'production') globalThis.tiffinMongoClient = mongoClient

export const mongoDb = mongoClient.db(process.env.MONGODB_DB || 'tiffintrack')
let indexSetup: Promise<void> | undefined

export function isMongoConfigured() {
  return Boolean(uri)
}

export function requireMongoConfiguration() {
  if (!uri) {
    throw new Error('MongoDB is not configured. Set MONGODB_URI to your MongoDB Atlas connection string.')
  }
}

export async function connectMongo() {
  requireMongoConfiguration()
  await mongoClient.connect()
  if (!indexSetup) {
    indexSetup = Promise.all([
      mongoDb.collection('businesses').createIndex({ ownerId: 1 }, { unique: true }),
      mongoDb.collection('businesses').createIndex({ inviteCode: 1 }, { unique: true }),
      mongoDb.collection('customerProfiles').createIndex({ ownerId: 1, email: 1 }, { unique: true }),
    ]).then(() => undefined).catch((error: unknown) => {
      indexSetup = undefined
      throw error
    })
  }
  await indexSetup
  return mongoDb
}
