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
    const t = this.db.transaction(() => {
      // Simplest consistent approach: clear and rewrite collections.
      this.db.exec("DELETE FROM users; DELETE FROM properties; DELETE FROM requests; DELETE FROM invites; DELETE FROM kv;");
      for (const u of this.data.users) this.upsertU.run(...U.map((c)=>this._val(u[c])));
      for (const p of this.data.properties) this.upsertP.run(...P.map((c)=>this._val(p[c])));
      for (const r of this.data.requests) this.upsertR.run(...R.map((c)=>this._val(r[c])));
      for (const i of this.data.invites) this.upsertI.run(...IV.map((c)=>this._val(i[c])));
      for (const [k,v] of Object.entries(this.data.settings)) this.upsertKV.run(k, JSON.stringify(v));
    });
    t();
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
