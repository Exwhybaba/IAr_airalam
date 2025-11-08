import mongoose from 'mongoose'

export async function connectMongo(uri){
  const mongoUri = uri || process.env.MONGO_URI || process.env.MONGODB_URI 
  mongoose.set('strictQuery', true)
  await mongoose.connect(mongoUri)
}

export default connectMongo
