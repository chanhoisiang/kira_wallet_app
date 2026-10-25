# Kira Wallet - IT Prototype

Kira Wallet is a mobile-first e-wallet and BNPL (Buy Now, Pay Later) management application built with **Vite**, **Tailwind CSS**, and **Supabase**.

## 🔗 Live Prototype Demo
- **Live Vercel URL:** [https://kira-wallet-app.vercel.app]
- **Demo Account Email:** demo@gmail.com
- **Demo Account Password:** demo123

---

## 📂 Repository Structure
- `/` (Root) & `/src` - Complete Vite + Tailwind CSS frontend application (`index.html`, `src/script.js`, `src/style.css`).
- `/backend` - Supabase PostgreSQL database schema (`schema.sql`) and backend configuration.
- `plan.txt` - Project development plan, architecture overview, and module breakdown.

---

## 🚀 Key Features
1. **Dashboard & Budget Tracking:** Visual breakdown of monthly spending limits and active balances.
2. **BNPL Installment Manager & Repayment Calendar:** Track multi-platform BNPL accounts (`bnpl_accounts`) and execute interactive installment payments.
3. **Affordability Simulator:** Evaluate whether a new installment plan fits comfortably within current financial constraints.
4. **Membership List:** Centralized directory displaying comprehensive member information and status.

---

## 🛠️ Local Installation & Setup Guide

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** or **yarn**

### Step 1: Configure Frontend
Open your terminal and navigate to the `frontend` folder:
```bash
cd frontend
npm install