import mongoose from "mongoose";
import { models } from "../models/index.mjs";

function plain(document) {
  if (!document) return null;
  const value = typeof document.toObject === "function" ? document.toObject() : document;
  const { _id, ...rest } = value;
  return { ...rest, id: String(_id) };
}

export class MongoRepository {
  constructor() {
    this.mode = "mongo";
  }

  model(name) {
    const model = models[name];
    if (!model) throw new Error(`Unknown repository collection: ${name}`);
    return model;
  }

  async create(name, values) {
    return plain(await this.model(name).create({ ...values, _id: values.id }));
  }

  async list(name, filter = {}, options = {}) {
    const model = this.model(name);
    const total = await model.countDocuments(filter);
    const sortKey = options.sortBy ?? "updatedAt";
    const order = options.order === "asc" ? 1 : -1;
    const docs = await model.find(filter).select("+passwordHash +tokenHash +resetTokenHash +verificationTokenHash").sort({ [sortKey]: order }).skip(options.offset ?? 0).limit(Math.min(options.limit ?? 100, 500)).lean();
    return { items: docs.map(plain), total };
  }

  async findOne(name, filter = {}) {
    return plain(await this.model(name).findOne(filter).select("+passwordHash +tokenHash +resetTokenHash +verificationTokenHash"));
  }

  async findById(name, id) {
    return plain(await this.model(name).findById(id).select("+passwordHash +tokenHash +resetTokenHash +verificationTokenHash"));
  }

  async update(name, id, patch) {
    return plain(await this.model(name).findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).select("+passwordHash +tokenHash +resetTokenHash +verificationTokenHash"));
  }

  async remove(name, id) {
    return plain(await this.model(name).findByIdAndDelete(id));
  }

  async removeMany(name, filter = {}) {
    const result = await this.model(name).deleteMany(filter);
    return result.deletedCount;
  }

  async upsert(name, filter, values) {
    return plain(await this.model(name).findOneAndUpdate(filter, { $set: values, $setOnInsert: filter }, { new: true, upsert: true, runValidators: true }));
  }

  async count(name, filter = {}) {
    return this.model(name).countDocuments(filter);
  }
}

export async function connectMongo(uri, dbName) {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 8000 });
  return mongoose.connection;
}

