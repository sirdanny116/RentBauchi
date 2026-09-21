const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  fullName TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Nigeria',
  bio TEXT NOT NULL DEFAULT '',
  profileImage TEXT NOT NULL DEFAULT '',
  verified INTEGER NOT NULL DEFAULT 0,
  ninImage TEXT NOT NULL DEFAULT '',
  verificationStatus TEXT NOT NULL DEFAULT '',
  passwordResetToken TEXT NOT NULL DEFAULT '',
  passwordResetExpires INTEGER NOT NULL DEFAULT 0,
  savedPropertyIds TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  ownerId TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  subtype TEXT NOT NULL DEFAULT '',
  annualRent REAL NOT NULL DEFAULT 0,
  inspectionFee REAL NOT NULL DEFAULT 0,
  bedrooms INTEGER NOT NULL DEFAULT 0,
  bathrooms INTEGER NOT NULL DEFAULT 0,
  facilities TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  media TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'PENDING',
  verified INTEGER NOT NULL DEFAULT 0,
  interestedRenterIds TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL DEFAULT '',
  adminReason TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  renterId TEXT NOT NULL,
  propertyId TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING',
  createdAt TEXT NOT NULL DEFAULT '',
  timeline TEXT NOT NULL DEFAULT '[]',
  adminMessage TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT '',
  expiresAt TEXT NOT NULL DEFAULT '',
  used INTEGER NOT NULL DEFAULT 0,
  usedAt TEXT NOT NULL DEFAULT '',
  createdBy TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

const U = [
  "id","role","fullName","username","phone","email","passwordHash","location",
  "country","bio","profileImage","verified","ninImage","verificationStatus",
  "passwordResetToken","passwordResetExpires","savedPropertyIds",
];
const P = [
  "id","ownerId","title","description","location","type","subtype","annualRent",
  "inspectionFee","bedrooms","bathrooms","facilities","address","media",
  "status","verified","interestedRenterIds","createdAt","adminReason",
];
const R = ["id","renterId","propertyId","type","message","status","createdAt","timeline","adminMessage"];
const IV = ["id","token","createdAt","expiresAt","used","usedAt","createdBy"];

function mapRow(cols, row) {
  const o = {};
  for (const c of cols) {
    let v = row[c];
    if (["savedPropertyIds","media","interestedRenterIds","timeline"].includes(c)) {
      o[c] = v ? JSON.parse(v) : (c === "media" ? [] : c === "timeline" ? [] : []);
    } else if (["verified","used","bedrooms","bathrooms"].includes(c)) {
      o[c] = !!v;
    } else if (["passwordResetExpires","annualRent","inspectionFee"].includes(c)) {
      o[c] = v == null ? v : Number(v);
    } else {
      o[c] = v;
    }
  }
  return o;
}

class Store {
  constructor(dbFile) {
    if (dbFile !== ":memory:") fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    this.db = new Database(dbFile);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA);
    this._prepare();
    this.data = this._load();
    this._resetSnapshot();
  }
  _prepare() {
    const db = this.db;
    this.selU = db.prepare("SELECT * FROM users");
    this.selP = db.prepare("SELECT * FROM properties");
    this.selR = db.prepare("SELECT * FROM requests");
    this.selI = db.prepare("SELECT * FROM invites");
    this.selKV = db.prepare("SELECT key, value FROM kv");

    this.upsertU = db.prepare(`INSERT INTO users (${U.join(",")}) VALUES (${U.map(()=>"?").join(",")})
      ON CONFLICT(id) DO UPDATE SET ${U.map((c)=>`${c}=excluded.${c}`).join(",")}`);
    this.upsertP = db.prepare(`INSERT INTO properties (${P.join(",")}) VALUES (${P.map(()=>"?").join(",")})
      ON CONFLICT(id) DO UPDATE SET ${P.map((c)=>`${c}=excluded.${c}`).join(",")}`);
    this.upsertR = db.prepare(`INSERT INTO requests (${R.join(",")}) VALUES (${R.map(()=>"?").join(",")})
      ON CONFLICT(id) DO UPDATE SET ${R.map((c)=>`${c}=excluded.${c}`).join(",")}`);
    this.upsertI = db.prepare(`INSERT INTO invites (${IV.join(",")}) VALUES (${IV.map(()=>"?").join(",")})
      ON CONFLICT(id) DO UPDATE SET ${IV.map((c)=>`${c}=excluded.${c}`).join(",")}`);
    this.upsertKV = db.prepare(`INSERT INTO kv (key, value) VALUES (?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
    this.deleteU = db.prepare("DELETE FROM users WHERE id=?");
    this.deleteP = db.prepare("DELETE FROM properties WHERE id=?");
    this.deleteR = db.prepare("DELETE FROM requests WHERE id=?");
    this.deleteI = db.prepare("DELETE FROM invites WHERE id=?");
    this.deleteKV = db.prepare("DELETE FROM kv WHERE key=?");
  }
  _load() {
    const data = { users: [], properties: [], requests: [], invites: [], settings: {} };
    for (const r of this.selU.all()) data.users.push(mapRow(U, r));
    for (const r of this.selP.all()) data.properties.push(mapRow(P, r));
    for (const r of this.selR.all()) data.requests.push(mapRow(R, r));
    for (const r of this.selI.all()) data.invites.push(mapRow(IV, r));
    for (const r of this.selKV.all()) data.settings[String(r.key)] = JSON.parse(r.value);
    return data;
  }
  save() {
    // Persist only what changed: upsert new or modified rows and delete removed
    // rows, rather than wiping and rewriting every table on each save.
    const snap = {
      users: new Map(this._snap.users),
      properties: new Map(this._snap.properties),
      requests: new Map(this._snap.requests),
      invites: new Map(this._snap.invites),
      settings: new Map(this._snap.settings),
    };
    const t = this.db.transaction(() => {
      this._sync(this.data.users, U, this.upsertU, this.deleteU, snap.users);
      this._sync(this.data.properties, P, this.upsertP, this.deleteP, snap.properties);
      this._sync(this.data.requests, R, this.upsertR, this.deleteR, snap.requests);
      this._sync(this.data.invites, IV, this.upsertI, this.deleteI, snap.invites);
      const keys = new Set();
      for (const [k, v] of Object.entries(this.data.settings)) {
        keys.add(k);
        const s = JSON.stringify(v);
        if (snap.settings.get(k) !== s) {
          this.upsertKV.run(k, s);
          snap.settings.set(k, s);
        }
      }
      for (const k of snap.settings.keys()) {
        if (!keys.has(k)) {
          this.deleteKV.run(k);
          snap.settings.delete(k);
        }
      }
    });
    t();
    this._snap = snap;
  }
  _serialize(cols, rec) {
    return JSON.stringify(cols.map((c) => this._val(rec[c])));
  }
  _resetSnapshot() {
    this._snap = {
      users: new Map(this.data.users.map((r) => [r.id, this._serialize(U, r)])),
      properties: new Map(this.data.properties.map((r) => [r.id, this._serialize(P, r)])),
      requests: new Map(this.data.requests.map((r) => [r.id, this._serialize(R, r)])),
      invites: new Map(this.data.invites.map((r) => [r.id, this._serialize(IV, r)])),
      settings: new Map(Object.entries(this.data.settings).map(([k, v]) => [k, JSON.stringify(v)])),
    };
  }
  _sync(list, cols, upsert, del, snap) {
    const seen = new Set();
    for (const rec of list) {
      seen.add(rec.id);
      const s = this._serialize(cols, rec);
      if (snap.get(rec.id) !== s) {
        upsert.run(...cols.map((c) => this._val(rec[c])));
        snap.set(rec.id, s);
      }
    }
    for (const id of snap.keys()) {
      if (!seen.has(id)) {
        del.run(id);
        snap.delete(id);
      }
    }
  }
  _val(v) {
    if (Array.isArray(v)) return JSON.stringify(v);
    if (typeof v === "boolean") return v ? 1 : 0;
    if (v === undefined || v === null) return "";
    return v;
  }
  seedIfEmpty(seed) {
    if (!this.data.users.length) {
      this.data.users = seed.users.map((u) => ({ ...u }));
      this.data.properties = seed.properties.map((p) => ({ ...p }));
      this.data.requests = seed.requests ? seed.requests.map((r) => ({ ...r })) : [];
      this.data.invites = seed.invites ? seed.invites.map((i) => ({ ...i })) : [];
      this.data.settings = seed.settings || { inspectionFee: 5000 };
      this.save();
    }
  }
  close() {
    try { this.db.close(); } catch {}
  }
}

module.exports = { Store };
