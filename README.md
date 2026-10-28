# Kira Wallet - BNPL Aggregator Prototype

Kira Wallet is a **non-lending Buy Now, Pay Later (BNPL) aggregator and budgeting web application** built with **JavaScript (ES6+)**, **Vite**, **Tailwind CSS**, **Chart.js**, and **Supabase**.

> **⚠️ Important Demonstration Notice:** Kira Wallet is a non-lending BNPL aggregator that uses **demonstration data**. Clicking **"Pay Now"** (or **"Pay All Due"**) only records a settlement in the database — **no real money moves** and no credit is issued.

## 🔗 Live Prototype Demo (Instant Access — No Setup Required)
- **Live Vercel URL:** [https://kira-wallet-app.vercel.app](https://kira-wallet-app.vercel.app)
- **Demo Account Email:** `demo@gmail.com`
- **Demo Account Password:** `demo123`
*(Note: You can also register any new email address on the Create Account tab — an automated database trigger will instantly seed the default RM 5,000 monthly budget and 5 demonstration BNPL accounts).*

---

## 📂 Repository Structure
- `frontend/` - Complete Vite + JavaScript frontend application (`index.html`, `src/script.js`, `src/style.css`, `package.json`, `package-lock.json`, `vite.config.js`, `manifest.json`, and `kiralogo.png`).
- `backend/` - Supabase PostgreSQL database schema (`schema.sql`), Row-Level Security (RLS) policies across all 5 tables, and RPC stored procedures.
- `requirements.txt` - Required runtime, build tools, libraries, pinned CDNs, and cloud services.
- `plan.txt` - Project development plan, system architecture, and module breakdown.
- `README.md` - Project overview and local setup instructions.

---

## 🚀 Key Features
1. **Unified BNPL Dashboard:** Consolidated view of active BNPL providers, total outstanding commitments, overdue alerts, and Shariah-compliant account filtering.
2. **Repayment Calendar & Simulated Settlement:** Track installment due dates across providers and click **"Pay Now"** to record a settlement in Supabase (demonstration data only; no real money moves).
3. **Spending Insights:** Visual portfolio breakdown across connected BNPL lines powered by Chart.js.
4. **Smart Budget & Pre-Purchase DSR Simulator:** Evaluate monthly budget impact and simulate how a new 3-, 6-, or 12-month installment plan affects disposable cashflow.
5. **Dispute Tracker & Open Finance Consent Centre:** Log merchant refund/dispute claims and toggle third-party BNPL provider data permissions.
6. **Multi-Tenant Cloud Backend:** Powered by Supabase Auth triggers (`seed_demo_data_on_signup`), Row-Level Security (RLS) on all 5 tables, and PostgreSQL RPC functions (`settle_bnpl_installment`).

---

## 🛠️ How to Run the Application Locally (Step-by-Step)

### Prerequisites
- **Node.js** (v18.0.0 or higher) installed on your machine.
- **npm** (included with Node.js).

### Step 1: Open the Project Folder & Navigate to `frontend`
1. Extract `Kira_Wallet_App.zip`.
2. Open **VS Code** (or your Terminal) in the `Kira_Wallet_App` root folder and navigate into `frontend/`:

```bash
cd frontend
```

### Step 2: Install Project Dependencies
Run the following command inside `frontend/` to install Vite and required packages:

```bash
npm install
```

### Step 3: Verify Production Build (Optional)
Confirm the application compiles cleanly:

```bash
npm run build
```

### Step 4: Start the Local Development Server
*(Note: No `.env` file is required. The public Supabase URL and `anon` client key are pre-configured inside `frontend/src/script.js` with Row-Level Security enabled on all 5 tables).*

Run the following command to launch the app:

```bash
npm run dev
```

### Step 5: View & Test the App in Your Browser
1. Open the local URL shown in your terminal:

```text
http://localhost:5173
```

2. **Log In:** Enter the demo credentials (`demo@gmail.com` / `demo123`) or click **Create Account** to register a fresh account (automatically seeded with an RM 5,000 budget and 5 BNPL accounts).
3. **Test Settlement:** Click **Pay Now** on an unpaid installment to verify that a settlement is recorded.

---

## 🗄️ Backend & Deployment Notes
- **Supabase Database Replication (Optional):** Create a project on [https://supabase.com](https://supabase.com), open the **SQL Editor**, and run `backend/schema.sql`.
- **Vercel Deployment:** If redeploying to Vercel after moving files into `frontend/`, go to **Vercel → Settings → General** and set **Root Directory** to `frontend`.