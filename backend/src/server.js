require("dotenv").config();
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const expressRateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Store } = require("./db");
const { sendPasswordReset, isConfigured: mailerConfigured } = require("./mailer");
const ROOT = path.resolve(__dirname, "../..");
const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "rent-bauchi-development-secret";
const WEAK_JWT_SECRETS = new Set(["change-this-for-production", "rent-bauchi-development-secret"]);
if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || WEAK_JWT_SECRETS.has(process.env.JWT_SECRET))) {
  console.error("FATAL: production requires a strong JWT_SECRET environment variable. See backend/.env.example");
  process.exit(1);
}
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "*").split(",").map((s) => s.trim()).filter(Boolean);
const STATIC_MAX_AGE = process.env.STATIC_MAX_AGE || "7d";
function cacheSeconds(value) {
  const m = /^(\d+)([smhd])?$/.exec(String(value));
  if (!m) return 604800;
  const n = Number(m[1]);
  switch (m[2]) {
    case "s": return n;
    case "m": return n * 60;
    case "h": return n * 3600;
    case "d": return n * 86400;
    default: return n;
  }
}
const STATIC_CACHE_SECONDS = cacheSeconds(STATIC_MAX_AGE);
const DB_CHECKPOINT_MS = Number(process.env.DB_CHECKPOINT_MS) || 60000;
const WHATSAPP_LINK = process.env.WHATSAPP_LINK || "https://wa.me/2348144319299";
const DATA_DIR = path.join(__dirname, "../data");
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, "rent-bauchi.db");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "../uploads");

fs.mkdirSync(UPLOAD_DIR, {recursive:true});

// Seed images shipped with the repo (data/seed-uploads) are copied into the
// uploads folder on boot, so demo listings keep their photos even on hosts with
// an ephemeral filesystem.
const SEED_UPLOAD_DIR = path.join(DATA_DIR, "seed-uploads");
if (fs.existsSync(SEED_UPLOAD_DIR)) {
  for (const name of fs.readdirSync(SEED_UPLOAD_DIR)) {
    const dest = path.join(UPLOAD_DIR, name);
    if (!fs.existsSync(dest)) {
      try { fs.copyFileSync(path.join(SEED_UPLOAD_DIR, name), dest); } catch (e) { console.error("[seed-uploads]", name, e.message); }
    }
  }
}

const seed = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "db.seed.json"), "utf8"));
const store = new Store(DB_FILE);
store.seedIfEmpty(seed);

function db(){ return store.data; }
function save(){ store.save(); }
function id(prefix){ return `${prefix}-${crypto.randomUUID()}`; }
function tokenFor(user){ return jwt.sign({id:user.id, role:user.role}, JWT_SECRET, {expiresIn:"7d"}); }
function publicUser(u){
  if(!u) return null;
  const {passwordHash, ninImage, passwordResetToken, passwordResetExpires, ...safe} = u;
  return safe;
}
function getUser(data, uid){ return data.users.find(u=>u.id===uid); }
function propertyView(data,p){
  const owner = publicUser(getUser(data,p.ownerId));
  const inspection = Number(p.inspectionFee || 0);
  const annualRent = Number(p.annualRent || 0);
  return {
    ...p,
    owner,
    inspectionFee: inspection,
    platformShare: Math.round(annualRent * 0.10),
    estimatedTotal: annualRent + inspection
  };
}
function auth(req,res,next){
  const raw=(req.headers.authorization||"").replace("Bearer ","");
  if(!raw) return res.status(401).json({message:"Authentication required"});
  try{ req.auth=jwt.verify(raw,JWT_SECRET); next(); }
  catch(e){ return res.status(401).json({message:"Invalid or expired session"}); }
}
function roles(...allowed){
  return (req,res,next)=> allowed.includes(req.auth.role)
    ? next() : res.status(403).json({message:"Access denied for this role"});
}
const authLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});
const generalLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-() ]{7,20}$/;
function validate(body, rules) {
  const missing = rules.filter((r) => r.required && (body[r.name] === undefined || body[r.name] === null || String(body[r.name]).trim() === ""));
  if (missing.length) return { ok: false, message: `${missing.map((m) => m.label).join(", ")} is required` };
  for (const r of rules) {
    const val = body[r.name];
    if (val === undefined || val === null || val === "") continue;
    if (r.type === "string" && r.max && String(val).length > r.max)
      return { ok: false, message: `${r.label} must be at most ${r.max} characters` };
    if (r.type === "email" && !EMAIL_RE.test(String(val)))
      return { ok: false, message: `A valid ${r.label} is required` };
    if (r.type === "phone" && !PHONE_RE.test(String(val)))
      return { ok: false, message: `${r.label} looks invalid` };
    if (r.type === "number" && Number.isNaN(Number(val)))
      return { ok: false, message: `${r.label} must be a number` };
    if (r.enum && !r.enum.includes(val))
      return { ok: false, message: `${r.label} is invalid` };
  }
  return { ok: true };
}
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DOC_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);
const MEDIA_TYPES = new Set([...IMAGE_TYPES, "video/mp4", "video/webm", "video/quicktime"]);
function uploader(allowedTypes) {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOAD_DIR),
      filename: (req, file, cb) => cb(null, Date.now() + "-" + crypto.randomBytes(5).toString("hex") + path.extname(file.originalname)),
    }),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      if (allowedTypes.has(file.mimetype)) return cb(null, true);
      cb(Object.assign(new Error(`Unsupported file type. Allowed: ${Array.from(allowedTypes).join(", ")}`), { status: 400 }));
    },
  });
}
const uploadImage = uploader(IMAGE_TYPES);
const uploadDoc = uploader(DOC_TYPES);
const uploadMedia = uploader(MEDIA_TYPES);

function originHandler(origin, callback) {
  if (!origin || CORS_ORIGINS.includes("*") || CORS_ORIGINS.includes(origin)) return callback(null, true);
  callback(Object.assign(new Error("Origin not allowed by CORS"), { status: 403 }));
}

app.use(cors({ origin: originHandler }));
app.use(compression());
app.use(express.json({limit:"2mb"}));
app.use("/api", generalLimiter);

const staticOptions = {
  index: "index.html",
  maxAge: STATIC_MAX_AGE,
  setHeaders: (res, filePath) => {
    if (String(filePath).endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    else res.setHeader("Cache-Control", `public, max-age=${STATIC_CACHE_SECONDS}`);
  },
};
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: STATIC_MAX_AGE }));
app.use("/admin", express.static(path.join(ROOT, "admin"), staticOptions));
app.use(express.static(path.join(ROOT, "public"), staticOptions));
app.get("/admin", (req,res)=>res.sendFile(path.join(ROOT,"admin","index.html")));

app.get("/api/health",(req,res)=>res.json({ok:true,service:"Rent Bauchi API"}));

app.post("/api/auth/register", authLimiter, async (req,res)=>{
  const {fullName,role,username,phone,email,password,confirmPassword}=req.body;
  const check = validate(req.body || {}, [
    { name:"fullName", label:"Full name", required:true, type:"string", max:120 },
    { name:"role", label:"Role", required:true, enum:["renter","agent"] },
    { name:"username", label:"Username", required:true, type:"string", max:50 },
    { name:"phone", label:"Phone", required:true, type:"phone" },
    { name:"email", label:"Email", required:true, type:"email" },
    { name:"password", label:"Password", required:true, type:"string" },
  ]);
  if(!check.ok) return res.status(400).json({message:check.message});
  if(password.length < 6) return res.status(400).json({message:"Password must be at least 6 characters"});
  if(password!==confirmPassword) return res.status(400).json({message:"Passwords do not match"});
  const data=db();
  if(data.users.some(u=>u.email.toLowerCase()===email.toLowerCase() || u.username.toLowerCase()===username.toLowerCase()))
    return res.status(409).json({message:"Email or username already exists"});
  const user={id:id("user"),role,fullName,username,phone,email,passwordHash:await bcrypt.hash(password,10),location:"",country:"Nigeria",bio:"",profileImage:"",verified:false};
  data.users.push(user); save();
  res.status(201).json({user:publicUser(user),token:tokenFor(user)});
});

app.post("/api/auth/login", authLimiter, async (req,res)=>{
  const {identifier,password}=req.body; const data=db();
  const user=data.users.find(u=>u.email.toLowerCase()===String(identifier||"").toLowerCase() || u.username.toLowerCase()===String(identifier||"").toLowerCase());
  if(!user || !(await bcrypt.compare(password||"",user.passwordHash))) return res.status(401).json({message:"Invalid login details"});
  delete user.passwordResetToken; delete user.passwordResetExpires; save();
  res.json({user:publicUser(user),token:tokenFor(user)});
});

app.post("/api/auth/admin-register", authLimiter, async (req,res)=>{
  const {inviteToken,fullName,username,phone,email,password,confirmPassword}=req.body; const data=db();
  const check = validate(req.body || {}, [
    { name:"inviteToken", label:"Admin invitation", required:true, type:"string" },
    { name:"fullName", label:"Full name", required:true, type:"string", max:120 },
    { name:"username", label:"Username", required:true, type:"string", max:50 },
    { name:"phone", label:"Phone", required:true, type:"phone" },
    { name:"email", label:"Email", required:true, type:"email" },
    { name:"password", label:"Password", required:true, type:"string" },
  ]);
  if(!check.ok) return res.status(400).json({message:check.message});
  const invite=data.invites.find(i=>i.token===inviteToken && !i.used && new Date(i.expiresAt)>new Date());
  if(!invite) return res.status(403).json({message:"A valid Admin referral/invitation is required"});
  if(password!==confirmPassword) return res.status(400).json({message:"Passwords do not match"});
  if(data.users.some(u=>u.email.toLowerCase()===email.toLowerCase() || u.username.toLowerCase()===username.toLowerCase()))
    return res.status(409).json({message:"Email or username already exists"});
  const user={id:id("user"),role:"admin",fullName,username,phone,email,passwordHash:await bcrypt.hash(password,10),location:"Bauchi",country:"Nigeria",bio:"",profileImage:"",verified:true};
  data.users.push(user); invite.used=true; invite.usedAt=new Date().toISOString(); save();
  res.status(201).json({user:publicUser(user),token:tokenFor(user)});
});

app.post("/api/auth/forgot", authLimiter, async (req,res)=>{
  const {email}=req.body; const data=db();
  const check = validate(req.body || {}, [{ name:"email", label:"Email", required:true, type:"email" }]);
  if(!check.ok) return res.status(400).json({message:check.message});
  const user=data.users.find(u=>u.email.toLowerCase()===String(email||"").toLowerCase());
  if(!user) return res.status(404).json({message:"No account found with that email"});
  const resetToken=crypto.randomInt(0,1000000).toString().padStart(6,"0");
  user.passwordResetToken=resetToken;
  user.passwordResetExpires=Date.now()+60*60*1000;
  save();
  try {
    await sendPasswordReset(user.email, resetToken);
  } catch (e) {
    console.error("[forgot] email failed:", e.message);
  }
  // In demo mode (no SMTP configured) the token is returned so the flow can be tested.
  const demoMode = !mailerConfigured();
  return res.json({
    message: demoMode
      ? "Reset code generated. Use the code below (demo mode)."
      : "A password reset code has been sent to your email.",
    ...(demoMode ? { resetToken } : {}),
  });
});

app.post("/api/auth/reset", authLimiter, async (req,res)=>{
  const {email,token,newPassword}=req.body; const data=db();
  const check = validate(req.body || {}, [{ name:"email", label:"Email", required:true, type:"email" }]);
  if(!check.ok) return res.status(400).json({message:check.message});
  const user=data.users.find(u=>u.email.toLowerCase()===String(email||"").toLowerCase());
  if(!user || user.passwordResetToken!==token) return res.status(400).json({message:"Invalid or expired reset token"});
  if(Date.now()>Number(user.passwordResetExpires||0)) return res.status(400).json({message:"Reset token has expired. Please request a new one."});
  if(!newPassword || newPassword.length<6) return res.status(400).json({message:"New password must be at least 6 characters"});
  user.passwordHash=await bcrypt.hash(newPassword,10);
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  save();
  res.json({message:"Password reset successfully. You can now log in."});
});

app.get("/api/auth/setup-status", (req, res) => {
  const d = db();
  const hasAdmin = d.users.some((u) => u.role === "admin");
  res.json({ required: !hasAdmin, keyRequired: !!process.env.SETUP_KEY });
});

app.post("/api/auth/setup-admin", authLimiter, async (req, res) => {
  const d = db();
  if (d.users.some((u) => u.role === "admin"))
    return res.status(403).json({message:"An admin already exists. Use login instead."});
  const {fullName, email, password, confirmPassword, phone, setupKey} = req.body;
  const check = validate(req.body || {}, [
    { name:"fullName", label:"Full name", required:true, type:"string", max:120 },
    { name:"email", label:"Email", required:true, type:"email" },
    { name:"password", label:"Password", required:true, type:"string" },
  ]);
  if(!check.ok) return res.status(400).json({message:check.message});
  if(password.length < 6) return res.status(400).json({message:"Password must be at least 6 characters"});
  if(password !== confirmPassword) return res.status(400).json({message:"Passwords do not match"});
  const key = process.env.SETUP_KEY || "";
  if(key && setupKey !== key) return res.status(403).json({message:"Invalid setup key"});
  if(d.users.some(u => u.email.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({message:"Email already in use"});
  let username = String(email).split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase() || "admin";
  let suffix = 1;
  while(d.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    username = String(email).split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase() + suffix;
    suffix++;
  }
  const user = {
    id: id("user"), role:"admin", fullName, username,
    phone: phone || "", email,
    passwordHash: await bcrypt.hash(password, 10),
    location: "Bauchi", country: "Nigeria", bio: "",
    profileImage: "", verified: true,
  };
  d.users.push(user);
  save();
  res.status(201).json({user: publicUser(user), token: tokenFor(user)});
});

app.get("/api/me",auth,(req,res)=>{ const d=db(); res.json({user:publicUser(getUser(d,req.auth.id))}); });

app.put("/api/profile",auth,(req,res)=>{
  const d=db(), u=getUser(d,req.auth.id);
  const {fullName,username,phone,location,country,bio}=req.body;
  if(bio && bio.trim().split(/\s+/).length>100) return res.status(400).json({message:"Bio must be 100 words or fewer"});
  if(username && d.users.some(x=>x.id!==u.id && x.username.toLowerCase()===username.toLowerCase())) return res.status(409).json({message:"Username already exists"});
  Object.assign(u,{fullName:fullName??u.fullName,username:username??u.username,phone:phone??u.phone,location:location??u.location,country:country??u.country,bio:bio??u.bio});
  save(); res.json({user:publicUser(u)});
});

app.put("/api/profile/password",auth,async(req,res)=>{
  const {currentPassword,newPassword}=req.body; const d=db(),u=getUser(d,req.auth.id);
  if(!(await bcrypt.compare(currentPassword||"",u.passwordHash))) return res.status(400).json({message:"Current password is incorrect"});
  if(!newPassword || newPassword.length<6) return res.status(400).json({message:"New password must be at least 6 characters"});
  u.passwordHash=await bcrypt.hash(newPassword,10); save(); res.json({message:"Password changed"});
});

app.post("/api/profile/image",auth,uploadImage.single("image"),(req,res)=>{
  if(!req.file) return res.status(400).json({message:"Image is required"});
  const d=db(),u=getUser(d,req.auth.id); u.profileImage=`/uploads/${req.file.filename}`; save();
  res.json({user:publicUser(u)});
});

app.post("/api/agent/nin",auth,roles("agent"),uploadDoc.single("nin"),(req,res)=>{
  if(!req.file) return res.status(400).json({message:"NIN document is required"});
  const d=db(),u=getUser(d,req.auth.id); u.ninImage=`/uploads/${req.file.filename}`; u.verificationStatus="PENDING"; save();
  res.json({message:"NIN submitted for Admin review"});
});

app.get("/api/platform/contact",(req,res)=>{
  const d=db(); const a=d.users.find(u=>u.role==="admin");
  res.json({fullName:a?.fullName||"Rent Bauchi Admin",phone:a?.phone||"",email:a?.email||"",whatsapp:WHATSAPP_LINK});
});

app.get("/api/properties",(req,res)=>{
  const d=db(); let list=d.properties.filter(p=>p.status==="APPROVED");
  const {q,location,type,subtype,maxRent,sort,page,limit}=req.query;
  if(q) list=list.filter(p=>(p.title+" "+p.description+" "+p.location).toLowerCase().includes(q.toLowerCase()));
  if(location) list=list.filter(p=>p.location.toLowerCase().includes(location.toLowerCase()));
  if(type) list=list.filter(p=>p.type===type);
  if(subtype) list=list.filter(p=>p.subtype===subtype);
  if(maxRent) list=list.filter(p=>Number(p.annualRent)<=Number(maxRent));
  if(sort==="price_asc") list=list.sort((a,b)=>Number(a.annualRent)-Number(b.annualRent));
  else if(sort==="price_desc") list=list.sort((a,b)=>Number(b.annualRent)-Number(a.annualRent));
  else if(sort==="newest") list=list.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  const total=list.length;
  const perPage=Math.max(1, Math.min(100, Number(limit)||9));
  const requestedPage=Math.max(1, Number(page)||1);
  const start=(requestedPage-1)*perPage;
  const items=list.slice(start,start+perPage).map(p=>propertyView(d,p));
  res.json({properties:items,total,page:requestedPage,pages:Math.ceil(total/perPage)});
});
app.get("/api/properties/:id",(req,res)=>{
  const d=db(),p=d.properties.find(x=>x.id===req.params.id && x.status==="APPROVED");
  if(!p) return res.status(404).json({message:"Property not found"});
  res.json({property:propertyView(d,p)});
});

app.post("/api/renter/saved/:id",auth,roles("renter"),(req,res)=>{
  const d=db(),u=getUser(d,req.auth.id),p=d.properties.find(x=>x.id===req.params.id);
  if(!p) return res.status(404).json({message:"Property not found"});
  u.savedPropertyIds=u.savedPropertyIds||[];
  if(!u.savedPropertyIds.includes(p.id)) u.savedPropertyIds.push(p.id);
  save(); res.json({message:"Property saved"});
});
app.delete("/api/renter/saved/:id",auth,roles("renter"),(req,res)=>{
  const d=db(),u=getUser(d,req.auth.id); u.savedPropertyIds=(u.savedPropertyIds||[]).filter(x=>x!==req.params.id); save(); res.json({message:"Removed"});
});
app.get("/api/renter/saved",auth,roles("renter"),(req,res)=>{
  const d=db(),u=getUser(d,req.auth.id); const ids=u.savedPropertyIds||[];
  res.json({properties:d.properties.filter(p=>ids.includes(p.id)).map(p=>propertyView(d,p))});
});

app.post("/api/renter/interested/:id",auth,roles("renter"),(req,res)=>{
  const d=db(),p=d.properties.find(x=>x.id===req.params.id); if(!p) return res.status(404).json({message:"Property not found"});
  p.interestedRenterIds=p.interestedRenterIds||[];
  if(!p.interestedRenterIds.includes(req.auth.id)) p.interestedRenterIds.push(req.auth.id);
  const request={id:id("req"),renterId:req.auth.id,propertyId:p.id,type:"interest",message:"Renter marked this property as Interested.",status:"PENDING",createdAt:new Date().toISOString(),timeline:[{status:"PENDING",at:new Date().toISOString()}]};
  d.requests.push(request); save(); res.status(201).json({request});
});

app.post("/api/renter/requests",auth,roles("renter"),(req,res)=>{
  const {propertyId,type,message}=req.body; const d=db();
  if(!["enquiry","inspection","payment","other"].includes(type)) return res.status(400).json({message:"Invalid request type"});
  const p=d.properties.find(x=>x.id===propertyId); if(!p) return res.status(404).json({message:"Property not found"});
  const request={id:id("req"),renterId:req.auth.id,propertyId,type,message:message||"",status:"PENDING",createdAt:new Date().toISOString(),timeline:[{status:"PENDING",at:new Date().toISOString()}]};
  d.requests.push(request); save(); res.status(201).json({request});
});
app.get("/api/renter/requests",auth,roles("renter"),(req,res)=>{
  const d=db(); const rows=d.requests.filter(r=>r.renterId===req.auth.id).map(r=>({...r,property:d.properties.find(p=>p.id===r.propertyId)?propertyView(d,d.properties.find(p=>p.id===r.propertyId)):null}));
  res.json({requests:rows});
});
app.delete("/api/renter/requests/:id",auth,roles("renter"),(req,res)=>{
  const d=db(); const idx=d.requests.findIndex(r=>r.id===req.params.id && r.renterId===req.auth.id);
  if(idx===-1) return res.status(404).json({message:"Request not found"});
  d.requests.splice(idx,1); save(); res.json({message:"Request removed"});
});

app.post("/api/agent/properties",auth,roles("agent"),(req,res)=>{
  const {title,description,location,type,subtype,annualRent,bedrooms,bathrooms,facilities,address}=req.body;
  const check = validate(req.body || {}, [
    { name:"title", label:"Title", required:true, type:"string", max:150 },
    { name:"location", label:"Location", required:true, type:"string", max:150 },
    { name:"type", label:"Property type", required:true, enum:["House","Shop","Office","Warehouse","Event Space","Residential"] },
    { name:"annualRent", label:"Annual rent", required:true, type:"number" },
    { name:"description", label:"Description", type:"string", max:2000 },
  ]);
  if(!check.ok) return res.status(400).json({message:check.message});
  if(Number(annualRent) < 0) return res.status(400).json({message:"Annual rent cannot be negative"});
  const d=db(); const p={id:id("prop"),ownerId:req.auth.id,title,description,location,type,subtype:subtype||"",annualRent:Number(annualRent),inspectionFee:0,bedrooms:Number(bedrooms||0),bathrooms:Number(bathrooms||0),facilities:facilities||"",address:address||location,media:[],status:"PENDING",verified:false,interestedRenterIds:[],createdAt:new Date().toISOString()};
  d.properties.push(p); save(); res.status(201).json({property:propertyView(d,p)});
});
app.get("/api/agent/properties",auth,roles("agent"),(req,res)=>{
  const d=db(); res.json({properties:d.properties.filter(p=>p.ownerId===req.auth.id).map(p=>propertyView(d,p))});
});
app.post("/api/agent/properties/:id/media",auth,roles("agent"),uploadMedia.array("media",10),(req,res)=>{
  const d=db(),p=d.properties.find(x=>x.id===req.params.id && x.ownerId===req.auth.id); if(!p) return res.status(404).json({message:"Property not found"});
  p.media=p.media||[]; for(const f of req.files||[]) p.media.push({url:`/uploads/${f.filename}`,name:f.originalname,type:f.mimetype});
  save(); res.json({property:propertyView(d,p)});
});

app.get("/api/admin/users",auth,roles("admin"),(req,res)=>{ const d=db(); res.json({users:d.users.map(publicUser)}); });
app.get("/api/admin/analytics",auth,roles("admin"),(req,res)=>{
  const d=db();
  const statusCount=(arr,key,val)=>arr.filter(x=>x[key]===val).length;
  const platformShare=(p)=>Math.round(Number(p.annualRent||0)*0.10);
  const revenue = d.properties.filter(p=>["APPROVED","RENTED"].includes(p.status));
  const monthLabel=(iso)=>{ const dt=new Date(iso||0); return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0"); };
  const monthSeries=(arr)=>arr.reduce((acc,x)=>{ const k=monthLabel(x.createdAt); acc[k]=(acc[k]||0)+1; return acc; },{});
  const sortedMonths=[...new Set([...d.properties,...d.requests].map(x=>monthLabel(x.createdAt)))].sort();
  res.json({
    counts: {
      renters: statusCount(d.users,"role","renter"),
      agents: statusCount(d.users,"role","agent"),
      admins: statusCount(d.users,"role","admin"),
      verifiedAgents: d.users.filter(u=>u.role==="agent" && u.verified).length,
      pendingVerifications: d.users.filter(u=>u.role==="agent" && u.verificationStatus==="PENDING").length,
      properties: d.properties.length,
      approved: statusCount(d.properties,"status","APPROVED"),
      pending: statusCount(d.properties,"status","PENDING"),
      rented: statusCount(d.properties,"status","RENTED"),
      declined: statusCount(d.properties,"status","DECLINED"),
      removed: statusCount(d.properties,"status","REMOVED"),
      requests: d.requests.length,
      requestStatus: d.requests.reduce((acc,r)=>{ acc[r.status]= (acc[r.status]||0)+1; return acc; },{}),
      interested: new Set(d.properties.flatMap(p=>p.interestedRenterIds||[])).size,
    },
    revenue: {
      gmv: revenue.reduce((s,p)=>s+Number(p.annualRent||0),0),
      platformShare: revenue.reduce((s,p)=>s+platformShare(p),0),
      inspectionFees: revenue.reduce((s,p)=>s+Number(p.inspectionFee||0),0),
    },
    trends: {
      months: sortedMonths,
      properties: sortedMonths.map(m=>monthSeries(d.properties)[m]||0),
      requests: sortedMonths.map(m=>monthSeries(d.requests)[m]||0),
    },
    propertyTypes: d.properties.reduce((acc,p)=>{ acc[p.type]= (acc[p.type]||0)+1; return acc; },{}),
  });
});
app.get("/api/admin/properties",auth,roles("admin"),(req,res)=>{ const d=db(); res.json({properties:d.properties.map(p=>propertyView(d,p))}); });
app.get("/api/admin/requests",auth,roles("admin"),(req,res)=>{
  const d=db(); res.json({requests:d.requests.map(r=>({...r,renter:publicUser(getUser(d,r.renterId)),property:d.properties.find(p=>p.id===r.propertyId)?propertyView(d,d.properties.find(p=>p.id===r.propertyId)):null,agent:publicUser(getUser(d,d.properties.find(p=>p.id===r.propertyId)?.ownerId))}))});
});
app.put("/api/admin/properties/:id",auth,roles("admin"),(req,res)=>{
  const d=db(),p=d.properties.find(x=>x.id===req.params.id); if(!p) return res.status(404).json({message:"Property not found"});
  const {action,reason,inspectionFee}=req.body;
  if(!["APPROVED","DECLINED","RENTED","REMOVED"].includes(action)) return res.status(400).json({message:"Invalid action"});
  if(action==="APPROVED"){
    if(inspectionFee===undefined||inspectionFee===null||Number(inspectionFee)<0)
      return res.status(400).json({message:"Inspection fee is required before approving a property"});
    p.inspectionFee=Number(inspectionFee);
  }
  p.status=action; p.verified=action==="APPROVED"; p.adminReason=reason||""; save(); res.json({property:propertyView(d,p)});
});
app.put("/api/admin/requests/:id",auth,roles("admin"),(req,res)=>{
  const d=db(),r=d.requests.find(x=>x.id===req.params.id); if(!r) return res.status(404).json({message:"Request not found"});
  const {status,message}=req.body; const allowed=["PENDING","ADMIN_CONTACTED_AGENT","INSPECTION_SCHEDULED","APPROVED","DECLINED","COMPLETED"];
  if(!allowed.includes(status)) return res.status(400).json({message:"Invalid status"});
  r.status=status; if(message) r.adminMessage=message; r.timeline=r.timeline||[]; r.timeline.push({status,at:new Date().toISOString(),message:message||""}); save(); res.json({request:r});
});
app.put("/api/admin/users/:id/verify",auth,roles("admin"),(req,res)=>{
  const d=db(),u=getUser(d,req.params.id); if(!u) return res.status(404).json({message:"User not found"});
  if(u.role!=="agent") return res.status(400).json({message:"Only owners can be verified here"});
  u.verified=req.body.verified!==false; u.verificationStatus=u.verified?"APPROVED":"REJECTED"; save(); res.json({user:publicUser(u)});
});
app.get("/api/admin/verification/:id",auth,roles("admin"),(req,res)=>{
  const d=db(),u=getUser(d,req.params.id); if(!u||u.role!=="agent") return res.status(404).json({message:"Owner not found"});
  res.json({agent:{...publicUser(u),ninImage:u.ninImage||""}});
});
app.post("/api/admin/invites",auth,roles("admin"),(req,res)=>{
  const d=db(); const invite={id:id("invite"),token:crypto.randomBytes(18).toString("hex"),createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+7*86400000).toISOString(),used:false,createdBy:req.auth.id};
  d.invites.push(invite); save(); res.status(201).json({invite});
});
app.get("/api/admin/settings",auth,roles("admin"),(req,res)=>res.json({settings:db().settings}));
app.put("/api/admin/settings",auth,roles("admin"),(req,res)=>{
  const d=db(); delete d.settings.serviceFee; save(); res.json({settings:d.settings});
});

app.use("/api", (req,res)=>res.status(404).json({message:"API endpoint not found"}));
app.use((err,req,res,next)=>{
  const uploaded = req.file ? [req.file] : [];
  if (Array.isArray(req.files)) uploaded.push(...req.files);
  for (const f of uploaded) {
    try { fs.unlinkSync(f.path); } catch {}
  }
  if (err && err.type === "entity.parse.failed")
    return res.status(400).json({message:"Invalid JSON in request body"});
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({ message: tooLarge ? "File too large (max 50 MB)" : err.message });
  }
  const status = Number(err.status || err.statusCode || 500);
  if (status >= 500) console.error("[server error]", err);
  res.status(status >= 400 && status <= 599 ? status : 500).json({ message: err.message || "Internal server error" });
});

if (require.main === module) {
  const server = app.listen(PORT, () => console.log(`Rent Bauchi API running on http://localhost:${PORT}`));
  const checkpoint = setInterval(() => {
    try { store.db.pragma("wal_checkpoint(PASSIVE)"); } catch {}
  }, DB_CHECKPOINT_MS);
  checkpoint.unref();
  function shutdown(signal) {
    console.log(`Received ${signal}; flushing SQLite WAL and shutting down.`);
    clearInterval(checkpoint);
    server.close(() => {
      try { store.db.pragma("wal_checkpoint(FULL)"); } catch {}
      try { store.close(); } catch {}
      process.exit(0);
    });
    setTimeout(() => { try { process.exit(1); } catch {} }, 5000).unref();
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

function createApp() { return app; }
module.exports = { createApp, app };
