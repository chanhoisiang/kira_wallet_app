# Kira Wallet - IT Prototype

Kira Wallet is a mobile-first e-wallet and BNPL (Buy Now, Pay Later) management application built with **Vite**, **Tailwind CSS**, and **Supabase**.

## 🔗 Live Prototype Demo (Instant Access — No Setup Required)
- **Live Vercel URL:** [https://kira-wallet-app.vercel.app](https://kira-wallet-app.vercel.app)
- **Demo Account Email:** `demo@gmail.com`
- **Demo Account Password:** `demo123`
*(Note: You can also register any new email address on the Sign Up tab — an automated database trigger will instantly seed default RM 5,000 budget settings and 5 BNPL accounts).*

---

## 📂 Repository Structure
- `/` (Root) & `/src` - Complete Vite + Tailwind CSS frontend application (`index.html`, `src/script.js`, `src/style.css`, `package.json`, `vite.config.js`).
- `/backend` - Supabase PostgreSQL database schema (`schema.sql`), Row-Level Security (RLS) policies, and RPC stored procedures.
- `plan.txt` - Project development plan, architecture overview, and module breakdown.

---

## 🚀 Key Features
1. **Dashboard & Budget Tracking:** Visual breakdown of monthly spending limits and active balances.
2. **BNPL Installment Manager & Repayment Calendar:** Track multi-platform BNPL accounts (`bnpl_accounts`) and execute atomic installment payments.
3. **Affordability Simulator:** Evaluate whether a new installment plan fits comfortably within current financial constraints.
4. **Membership List:** Centralized directory displaying comprehensive member information and status.
5. **Multi-Tenant Cloud Backend:** Powered by Supabase Auth triggers (`seed_demo_data_on_signup`), Row-Level Security (RLS), and PostgreSQL RPC functions (`settle_bnpl_installment`).

---

## 🛠️ How to Run the Application Locally (Step-by-Step)

### Prerequisites
- **Node.js** (v18.0.0 or higher) installed on your machine.
- **npm** (included with Node.js).

### Step 1: Open the Project Folder in Terminal
1. Extract the submitted `.zip` file (or clone the repository).
2. Open **VS Code** (or your Terminal) directly inside the root project folder (`kira_wallet_app` — where `package.json` and `index.html` are located).

### Step 2: Install Project Dependencies
Run the following command in the terminal to install Vite and required packages:

    npm install

### Step 3: Start the Local Development Server
*(Note: No `.env` setup is required. The public Supabase URL and `anon` client key are already pre-configured inside `src/script.js` with Row-Level Security enabled so the app connects to the cloud database immediately).*

Run the following command to launch the app:

    npm run dev

### Step 4: View & Test the App in Your Browser
1. Once the terminal displays the local server URL, open your browser and go to:

    http://localhost:5173

2. **Log In:** Enter the demo credentials (`demo@gmail.com` / `demo123`) or click **Sign Up** to create a fresh test account.
3. **Recommended Mobile View:** Press `F12` (or `Cmd + Option + I` on Mac) in your browser and click the **Toggle Device Toolbar** icon (phone/tablet icon) to view the mobile e-wallet layout.

---

## 🗄️ Backend Setup & Replication Guide (Optional)
The live Supabase PostgreSQL database is already active and connected to the frontend. If you wish to replicate the database from scratch on your own Supabase account:
1. Create a new project on [https://supabase.com](https://supabase.com)
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Copy the entire SQL script from `backend/schema.sql`, paste it into the editor, and click **Run**.
4. In `src/script.js` (Lines 4–5), replace `SUPABASE_URL` and `SUPABASE_ANON_KEY` with your new project's URL and `anon` public key.