# 🔒 SECURITY GUIDE - Kas Juara Sepatu

**Last Updated:** 26 Oktober 2026  
**Status:** ✅ Enhanced Security Implemented

---

## 🎯 SECURITY OVERVIEW

Project ini menggunakan **Supabase** sebagai backend. Keamanan aplikasi bergantung pada:

1. ✅ **Row Level Security (RLS)** di Supabase
2. ✅ **Input Validation** di frontend
3. ✅ **Environment Variables** untuk secrets
4. ✅ **Git Security** (no secrets committed)

---

## 🚨 CRITICAL: ISSUE #1 - API KEYS SECURITY

### ✅ STATUS: VERIFIED SECURE

**Verification Results:**
```bash
# Check 1: .env tidak pernah ter-commit
git log --all --full-history -- .env
Result: ✅ Empty output (NEVER committed)

# Check 2: .env ada di .gitignore
grep "^\.env" .gitignore
Result: ✅ Found at line 9

# Check 3: .env tidak di-track oleh Git
git ls-files | grep "\.env"
Result: ✅ Not tracked
```

**Conclusion:** 🎉 **API keys AMAN! Tidak pernah terekspos.**

---

## 🛡️ ISSUE #4: SUPABASE ROW LEVEL SECURITY (RLS)

### 📋 SETUP INSTRUCTIONS

#### **Step 1: Login ke Supabase Dashboard**
1. Buka: https://supabase.com/dashboard
2. Login dengan akun Anda
3. Pilih project: `kas-juara-sepatu` (atau nama project Anda)

#### **Step 2: Execute RLS SQL Script**
1. Klik **"SQL Editor"** di sidebar kiri
2. Klik **"New Query"**
3. Copy-paste isi file `supabase_rls_setup.sql`
4. Klik **"Run"** atau tekan `Ctrl + Enter`

#### **Step 3: Verify RLS Aktif**
Run query berikut di SQL Editor:

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'kas_juara_state';
-- Expected: rowsecurity = true ✅

-- Check policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'kas_juara_state';
-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE) ✅
```

#### **Step 4: Test dari App**
1. Refresh aplikasi web Anda
2. Test operasi CRUD:
   - ✅ Tambah transaksi baru
   - ✅ Edit transaksi existing
   - ✅ Sync ke Supabase
   - ✅ Load dari Supabase
3. Semua harus berfungsi normal

---

## 🔑 ENVIRONMENT VARIABLES

### **Development Setup**

1. **Copy template:**
   ```bash
   copy .env.example .env
   ```

2. **Fill dengan credentials Anda:**
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Get credentials dari Supabase:**
   - Login to Supabase Dashboard
   - Project Settings → API
   - Copy **URL** dan **anon public key**

### **⚠️ NEVER DO THIS:**

❌ **DON'T** commit `.env` to Git  
❌ **DON'T** share anon key publicly  
❌ **DON'T** hardcode keys in source code  
❌ **DON'T** paste keys in screenshots/videos  
❌ **DON'T** share keys via email/chat (use secure vault)

### **✅ SAFE PRACTICES:**

✅ **DO** keep `.env` in `.gitignore`  
✅ **DO** use `.env.example` as template  
✅ **DO** rotate keys if potentially exposed  
✅ **DO** use environment variables in CI/CD  
✅ **DO** document required env vars in README

---

## 🔄 KEY ROTATION (If Keys Exposed)

Jika Anda **accidentally** commit/share keys:

### **1. Rotate Supabase Keys**
1. Login to Supabase Dashboard
2. Go to: **Settings** → **API**
3. Scroll to **"Project API Keys"**
4. Click **"Generate new anon key"**
5. Update `.env` dengan key baru
6. Redeploy aplikasi

### **2. Clean Git History (If Committed)**
```bash
# DANGER: This rewrites Git history!
# Only do this on personal/private repos

# Remove .env from all Git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (DANGER!)
git push origin --force --all
git push origin --force --tags
```

⚠️ **WARNING:** `git filter-branch` rewrites history! Coordinate with team first.

### **3. Revoke Old Keys**
1. Di Supabase Dashboard
2. Settings → API → Service Keys
3. Hapus/disable old keys
4. Only keep new keys active

---

## 🧪 SECURITY TESTING CHECKLIST

### **✅ Pre-Deployment Checklist**

Before deploying to production, verify:

- [ ] ✅ `.env` tidak ter-commit ke Git
- [ ] ✅ `.env.example` tersedia (tanpa real credentials)
- [ ] ✅ Supabase RLS enabled untuk semua tables
- [ ] ✅ RLS policies tested dan berfungsi
- [ ] ✅ Input validation aktif di semua forms
- [ ] ✅ Storage quota warnings implemented
- [ ] ✅ Error messages tidak expose sensitive info
- [ ] ✅ HTTPS enabled di production
- [ ] ✅ Rate limiting configured di Supabase

### **🔍 Regular Security Audit**

**Monthly:**
- [ ] Review Supabase logs untuk suspicious activity
- [ ] Check for failed authentication attempts
- [ ] Verify RLS policies masih aktif
- [ ] Test input validation masih berfungsi

**Quarterly:**
- [ ] Rotate Supabase keys (best practice)
- [ ] Update dependencies (`npm audit fix`)
- [ ] Review access logs
- [ ] Penetration testing (optional)

---

## 🚀 DEPLOYMENT SECURITY

### **GitHub Actions / CI/CD**

Store secrets di **GitHub Secrets** (NEVER in code):

```yaml
# .github/workflows/deploy.yml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

**Setup GitHub Secrets:**
1. Repository → Settings → Secrets and variables → Actions
2. Click **"New repository secret"**
3. Name: `VITE_SUPABASE_URL`
4. Value: Your Supabase URL
5. Repeat for `VITE_SUPABASE_ANON_KEY`

### **Netlify / Vercel**

Add environment variables di dashboard:

**Netlify:**
- Site Settings → Build & Deploy → Environment
- Add: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Vercel:**
- Project Settings → Environment Variables
- Add variables untuk Production, Preview, Development

---

## 📊 SECURITY LAYERS

Aplikasi ini menggunakan **Defense in Depth** strategy:

```
┌─────────────────────────────────────────┐
│ 1. Frontend Input Validation            │ ← ✅ IMPLEMENTED
│    • NaN/Infinity checks                │
│    • Range validation                   │
│    • Type checking                      │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ 2. Environment Variables                │ ← ✅ SECURED
│    • .env not committed                 │
│    • Keys in .gitignore                 │
│    • Template in .env.example           │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ 3. Supabase Row Level Security (RLS)    │ ← ⚠️ TO BE ENABLED
│    • Table-level access control         │
│    • Policy-based authorization         │
│    • SQL-level security                 │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ 4. Storage Quota Protection             │ ← ✅ IMPLEMENTED
│    • Size monitoring                    │
│    • Graceful fallback                  │
│    • User warnings                      │
└─────────────────────────────────────────┘
```

---

## 🆘 INCIDENT RESPONSE

### **If Security Breach Detected:**

1. **Immediate Actions:**
   - [ ] Rotate ALL Supabase keys immediately
   - [ ] Review Supabase logs for unauthorized access
   - [ ] Check for data modifications/deletions
   - [ ] Disable compromised API keys

2. **Assessment:**
   - [ ] Identify scope of breach
   - [ ] Determine what data was accessed
   - [ ] Check backup integrity
   - [ ] Document timeline of events

3. **Recovery:**
   - [ ] Restore from backup if needed
   - [ ] Update all credentials
   - [ ] Patch security vulnerabilities
   - [ ] Deploy hotfix

4. **Prevention:**
   - [ ] Implement additional security measures
   - [ ] Update documentation
   - [ ] Train team on security best practices
   - [ ] Set up monitoring/alerts

### **Emergency Contacts:**

- **Supabase Support:** support@supabase.io
- **Project Owner:** [Your Email]
- **Dev Team Lead:** [Team Lead Email]

---

## 📚 ADDITIONAL RESOURCES

### **Supabase Security:**
- [RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Auth Policies Examples](https://supabase.com/docs/guides/auth/row-level-security#policy-examples)

### **General Security:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Security Checklist](https://github.com/virajkulkarni14/WebDevelopmentSecurityChecklist)
- [Node Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

## ✅ CURRENT STATUS

### **Implemented (October 26, 2026):**

✅ **Issue #1 - API Keys Security**
- `.env` verified safe (never committed)
- `.env.example` created as template
- `.gitignore` properly configured

✅ **Issue #2 - Input Validation**
- All forms have comprehensive validation
- NaN/Infinity/Negative blocked
- User-friendly error messages

✅ **Issue #3 - Storage Quota**
- Size monitoring implemented
- Multi-tier fallback system
- Clear user warnings

⚠️ **Issue #4 - Supabase RLS**
- **Status:** SQL script ready (`supabase_rls_setup.sql`)
- **Action Required:** Execute script in Supabase Dashboard
- **Estimated Time:** 5 minutes
- **Priority:** HIGH (do before production)

---

## 🎯 NEXT STEPS

1. **NOW (Before Production):**
   - [ ] Execute `supabase_rls_setup.sql` in Supabase Dashboard
   - [ ] Verify RLS policies working
   - [ ] Test all CRUD operations
   - [ ] Document deployment credentials securely

2. **SOON (Within 1 Month):**
   - [ ] Set up Supabase rate limiting
   - [ ] Configure monitoring/alerts
   - [ ] Document incident response procedures
   - [ ] Schedule first security audit

3. **FUTURE (When Scaling):**
   - [ ] Implement Supabase Authentication
   - [ ] Migrate to user-based RLS policies
   - [ ] Add IP whitelisting
   - [ ] Set up WAF (Web Application Firewall)

---

**Questions?** Contact project maintainer or review Supabase docs.

**Last Audit:** October 26, 2026  
**Next Audit:** November 26, 2026  
**Audit Frequency:** Monthly

---

*This document is maintained by Kiro AI and project team.*
