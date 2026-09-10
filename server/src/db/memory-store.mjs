import { randomUUID } from "node:crypto";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function sameValue(actual, expected) {
  if (expected instanceof RegExp) return expected.test(String(actual ?? ""));
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    if ("$in" in expected) return expected.$in.includes(actual);
    if ("$ne" in expected) return actual !== expected.$ne;
  }
  return String(actual) === String(expected);
}

function matches(item, filter = {}) {
  return Object.entries(filter).every(([key, value]) => sameValue(item[key], value));
}

export class MemoryRepository {
  constructor() {
    this.mode = "memory";
    this.collections = new Map();
  }

  bucket(name) {
    if (!this.collections.has(name)) this.collections.set(name, new Map());
    return this.collections.get(name);
  }

  async create(name, values) {
    const now = new Date().toISOString();
    const item = { ...clone(values), id: values.id ?? randomUUID(), createdAt: values.createdAt ?? now, updatedAt: now };
    this.bucket(name).set(item.id, item);
    return clone(item);
  }

  async list(name, filter = {}, options = {}) {
    let items = [...this.bucket(name).values()].filter((item) => matches(item, filter));
    const sortKey = options.sortBy ?? "updatedAt";
    const direction = options.order === "asc" ? 1 : -1;
    items.sort((a, b) => String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? "")) * direction);
    const total = items.length;
    const offset = Math.max(0, options.offset ?? 0);
    const limit = Math.max(1, Math.min(options.limit ?? 100, 500));
    items = items.slice(offset, offset + limit);
    return { items: clone(items), total };
  }

  async findOne(name, filter = {}) {
    const item = [...this.bucket(name).values()].find((candidate) => matches(candidate, filter));
    return clone(item ?? null);
  }

  async findById(name, id) {
    return clone(this.bucket(name).get(String(id)) ?? null);
  }

  async update(name, id, patch) {
    const current = this.bucket(name).get(String(id));
    if (!current) return null;
    const item = { ...current, ...clone(patch), id: current.id, updatedAt: new Date().toISOString() };
    this.bucket(name).set(item.id, item);
    return clone(item);
  }

  async remove(name, id) {
    const item = this.bucket(name).get(String(id));
    if (!item) return null;
    this.bucket(name).delete(String(id));
    return clone(item);
  }

  async removeMany(name, filter = {}) {
    const ids = [...this.bucket(name).values()].filter((item) => matches(item, filter)).map((item) => item.id);
    ids.forEach((id) => this.bucket(name).delete(id));
    return ids.length;
  }

  async upsert(name, filter, values) {
    const current = await this.findOne(name, filter);
    return current ? this.update(name, current.id, values) : this.create(name, { ...filter, ...values });
  }

  async count(name, filter = {}) {
    return [...this.bucket(name).values()].filter((item) => matches(item, filter)).length;
  }
}

