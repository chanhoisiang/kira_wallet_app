import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1. Initialize Supabase
const SUPABASE_URL = 'https://mqlsvfzsavioppmejuze.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbHN2ZnpzYXZpb3BwbWVqdXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNTUxNzAsImV4cCI6MjEwNzYzMTE3MH0.eN9XQ3Ecw40N0XemfB0WV_1qXsVWOCzztwlIfhdVUMo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global Data State
let accountsData = [];
let budgetData = { id: null, income: 5000, expenses: 3200 };
let disputesData = [];
let paymentHistoryData = [];
let chartInstance = null;

// Auth & Backend Session State
let currentUser = null;
let currentProfile = null;
let authMode = 'login'; // 'login' | 'signup'
let realtimeChannel = null;
let pendingPinCallback = null;
let isFetchingData = false;

// Interactive UI State
let isBalanceMasked = false;
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let selectedCalDay = null;
let simTenure = 3;

// Default Credit Limits per Provider
const CREDIT_LIMITS = {
    'SPayLater': 1500,
    'Atome': 1200,
    'Grab PayLater': 1000,
    "Touch 'n Go PayLater": 1000,
    'hoolah': 800
};

// Formatters
const formatRM = (num) => Number(num).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const displayMoney = (num) => isBalanceMasked ? '****' : formatRM(num);
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

function showToast(message) {
    const toast = document.getElementById('consent-toast');
    const msgEl = document.getElementById('toast-msg');
    if (!toast || !msgEl) return;
    msgEl.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2800);
}

// Dynamic Overdue / Upcoming Determination
function getDynamicStatus(status, dateStr) {
    if (status === 'Paid') return 'Paid';
    if (!dateStr) return status || 'Upcoming';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = dateStr.split('-').map(Number);
    const dueDate = new Date(y, m - 1, d);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate >= today ? 'Upcoming' : 'Unpaid';
}

// ============================================================================
// AUTHENTICATION, PIN MODAL & SESSION UI (Cleaned Wording & Zero Duplicates)
// ============================================================================
function injectAuthAndSecurityUI() {
    document.getElementById('auth-overlay')?.remove();
    document.getElementById('user-session-bar')?.remove();

    if (document.getElementById('kira-auth-overlay')) return;

    const uiWrapper = document.createElement('div');
    uiWrapper.innerHTML = `
        <!-- 1. FULL-SCREEN AUTHENTICATION GATE OVERLAY -->
        <div id="kira-auth-overlay" class="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 transition-all">
            <div class="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-blue-100">
                <div class="text-center mb-6">
                    <!-- LOGO WITH FALLBACK TO STYLIZED 'K' IF LOGO.PNG IS MISSING -->
                    <div class="w-16 h-16 mx-auto mb-3 rounded-2xl overflow-hidden shadow-xl shadow-blue-500/20 bg-[#0062eb] flex items-center justify-center text-white font-black text-2xl">
                        <img src="logo.png" alt="Kira Wallet" class="w-full h-full object-cover" onerror="this.style.display='none';this.parentElement.innerHTML='K';" />
                    </div>
                    <h2 class="text-2xl font-black text-slate-900">Kira Wallet</h2>
                    <p id="kira-auth-subtitle" class="text-xs font-semibold text-slate-500 mt-1">Sign in to manage your BNPL installments & budget</p>
                </div>

                <!-- Sign In / Create Account Switcher -->
                <div class="grid grid-cols-2 bg-[#eef5ff] p-1 rounded-2xl mb-5 border border-blue-100">
                    <button type="button" id="kira-tab-login" onclick="switchAuthMode('login')" class="py-2.5 rounded-xl text-xs font-extrabold bg-[#0062eb] text-white shadow-xs transition-all cursor-pointer">
                        Sign In
                    </button>
                    <button type="button" id="kira-tab-signup" onclick="switchAuthMode('signup')" class="py-2.5 rounded-xl text-xs font-extrabold text-slate-600 hover:text-slate-900 transition-all cursor-pointer">
                        Create Account
                    </button>
                </div>

                <form id="kira-auth-form" onsubmit="handleAuthSubmit(event)" class="space-y-4">
                    <div id="kira-name-wrap" class="hidden">
                        <label class="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                        <input type="text" id="kira-input-name" placeholder="Enter your full name" class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0062eb] text-sm font-semibold outline-none transition" />
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                        <input type="email" id="kira-input-email" placeholder="you@example.com" required class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0062eb] text-sm font-semibold outline-none transition" />
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Password</label>
                        <input type="password" id="kira-input-password" placeholder="At least 6 characters" minlength="6" required class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0062eb] text-sm font-semibold outline-none transition" />
                    </div>

                    <div id="kira-pin-wrap" class="hidden">
                        <label class="block text-xs font-bold text-slate-700 mb-1">4-Digit Wallet PIN <span class="text-slate-400 font-medium">(Used to approve payments)</span></label>
                        <input type="password" id="kira-input-pin" placeholder="e.g. 1234" maxlength="4" pattern="\\d{4}" inputmode="numeric" class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0062eb] text-sm font-black tracking-widest text-center outline-none transition" />
                    </div>

                    <p id="kira-auth-msg" class="text-xs font-bold text-center min-h-[18px] text-red-600"></p>

                    <button type="submit" id="kira-submit-btn" class="w-full py-3.5 rounded-2xl bg-[#0062eb] hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 transition active:scale-[0.99] cursor-pointer">
                        Sign In
                    </button>
                </form>

                <div id="kira-forgot-wrap" class="mt-4 text-center">
                    <button type="button" onclick="handleForgotPassword()" class="text-xs font-bold text-[#0062eb] hover:underline cursor-pointer">
                        Forgot Password?
                    </button>
                </div>
            </div>
        </div>

        <!-- 2. 4-DIGIT SECURITY PIN VERIFICATION MODAL -->
        <div id="kira-pin-modal" class="hidden fixed inset-0 z-[9998] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div class="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl border border-blue-100 text-center">
                <div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#eef5ff] text-[#0062eb] flex items-center justify-center font-black text-xl">
                    🔒
                </div>
                <h3 class="text-base font-black text-slate-900" id="pin-modal-title">Approve Transaction</h3>
                <p class="text-xs text-slate-500 font-medium mt-1 mb-4" id="pin-modal-desc">Enter your 4-digit Wallet PIN</p>
                
                <form onsubmit="confirmPinModal(event)" class="space-y-3">
                    <input type="password" id="pin-modal-input" maxlength="4" inputmode="numeric" placeholder="••••" required class="w-full py-3 rounded-xl border-2 border-blue-200 focus:border-[#0062eb] text-center text-xl font-black tracking-[0.5em] outline-none" />
                    <p id="pin-modal-error" class="text-[11px] font-bold text-red-600 min-h-[16px]"></p>
                    <div class="grid grid-cols-2 gap-2 pt-1">
                        <button type="button" onclick="closePinModal()" class="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
                            Cancel
                        </button>
                        <button type="submit" class="py-2.5 rounded-xl bg-[#0062eb] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition">
                            Confirm
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- 3. FLOATING USER SESSION & SIGN-OUT PILL (Top-Right) -->
        <div id="kira-session-pill" class="hidden fixed top-3 right-3 z-50 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md border border-blue-100">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span id="kira-user-display" class="text-[11px] font-extrabold text-slate-700 max-w-[140px] truncate">Wallet Active</span>
            <button onclick="handleSignOut()" class="text-[10px] font-extrabold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-0.5 rounded-full transition cursor-pointer">
                Sign Out
            </button>
        </div>
    `;
    document.body.appendChild(uiWrapper);
}

window.switchAuthMode = function(mode) {
    authMode = mode;
    const isSignup = mode === 'signup';

    const loginTab = document.getElementById('kira-tab-login');
    const signupTab = document.getElementById('kira-tab-signup');
    if (loginTab && signupTab) {
        loginTab.className = !isSignup
            ? 'py-2.5 rounded-xl text-xs font-extrabold bg-[#0062eb] text-white shadow-xs transition-all cursor-pointer'
            : 'py-2.5 rounded-xl text-xs font-extrabold text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
        signupTab.className = isSignup
            ? 'py-2.5 rounded-xl text-xs font-extrabold bg-[#0062eb] text-white shadow-xs transition-all cursor-pointer'
            : 'py-2.5 rounded-xl text-xs font-extrabold text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
    }

    document.getElementById('kira-name-wrap')?.classList.toggle('hidden', !isSignup);
    document.getElementById('kira-pin-wrap')?.classList.toggle('hidden', !isSignup);
    document.getElementById('kira-forgot-wrap')?.classList.toggle('hidden', isSignup);

    const subtitleEl = document.getElementById('kira-auth-subtitle');
    if (subtitleEl) {
        subtitleEl.textContent = isSignup
            ? 'Create your account to track BNPL & Shariah installments'
            : 'Sign in to manage your BNPL installments & budget';
    }

    const submitBtn = document.getElementById('kira-submit-btn');
    if (submitBtn) {
        submitBtn.textContent = isSignup ? 'Create Free Account' : 'Sign In';
    }

    const msgEl = document.getElementById('kira-auth-msg');
    if (msgEl) msgEl.textContent = '';
};

// Backwards-compatible alias in case index.html still calls switchAuthTab
window.switchAuthTab = window.switchAuthMode;

window.handleAuthSubmit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('kira-input-email')?.value.trim();
    const password = document.getElementById('kira-input-password')?.value;
    const fullName = document.getElementById('kira-input-name')?.value.trim() || email.split('@')[0];
    const adminPin = document.getElementById('kira-input-pin')?.value.trim() || '1234';
    const msgEl = document.getElementById('kira-auth-msg');
    const btnEl = document.getElementById('kira-submit-btn');

    if (!email || !password) return;

    if (msgEl) {
        msgEl.className = 'text-xs font-bold text-center min-h-[18px] text-blue-600';
        msgEl.textContent = authMode === 'signup' ? 'Creating your wallet...' : 'Signing you in...';
    }
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.textContent = authMode === 'signup' ? 'Setting Up Account...' : 'Signing In...';
    }

    try {
        if (authMode === 'signup') {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName, admin_pin: adminPin }
                }
            });
            if (error) throw error;

            // If email confirmation is OFF, session is returned immediately
            if (data?.session?.user) {
                currentUser = data.session.user;
                document.getElementById('kira-auth-overlay')?.classList.add('hidden');
                document.getElementById('kira-session-pill')?.classList.remove('hidden');
                showToast(`Welcome to Kira Wallet, ${fullName}!`);
                await loadAppData();
                subscribeToRealtimeSync();
            } else if (data?.user) {
                // Attempt automatic sign-in right away
                const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
                if (!signInErr && signInData?.session?.user) {
                    currentUser = signInData.session.user;
                    document.getElementById('kira-auth-overlay')?.classList.add('hidden');
                    document.getElementById('kira-session-pill')?.classList.remove('hidden');
                    showToast(`Welcome to Kira Wallet, ${fullName}!`);
                    await loadAppData();
                    subscribeToRealtimeSync();
                } else {
                    if (msgEl) {
                        msgEl.className = 'text-xs font-bold text-center min-h-[18px] text-emerald-600';
                        msgEl.textContent = 'Account created! Please disable "Confirm email" in Supabase or check your inbox.';
                    }
                    switchAuthMode('login');
                }
            }
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            if (data?.session?.user) {
                currentUser = data.session.user;
                document.getElementById('kira-auth-overlay')?.classList.add('hidden');
                document.getElementById('kira-session-pill')?.classList.remove('hidden');
                showToast('Signed in successfully!');
                await loadAppData();
                subscribeToRealtimeSync();
            }
        }
    } catch (err) {
        if (msgEl) {
            msgEl.className = 'text-xs font-bold text-center min-h-[18px] text-red-600';
            msgEl.textContent = err.message || 'Unable to authenticate. Please try again.';
        }
    } finally {
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.textContent = authMode === 'signup' ? 'Create Free Account' : 'Sign In';
        }
    }
};

window.handleForgotPassword = async function() {
    const email = document.getElementById('kira-input-email')?.value.trim();
    const msgEl = document.getElementById('kira-auth-msg');
    if (!email) {
        if (msgEl) {
            msgEl.className = 'text-xs font-bold text-center min-h-[18px] text-red-600';
            msgEl.textContent = 'Enter your email address above first to reset your password.';
        }
        return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
    });
    if (msgEl) {
        msgEl.className = error
            ? 'text-xs font-bold text-center min-h-[18px] text-red-600'
            : 'text-xs font-bold text-center min-h-[18px] text-emerald-600';
        msgEl.textContent = error ? error.message : 'Password reset link sent to your email!';
    }
};

window.handleSignOut = async function() {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    document.getElementById('kira-auth-overlay')?.classList.remove('hidden');
    document.getElementById('kira-session-pill')?.classList.add('hidden');
    showToast('Signed out of Kira Wallet.');
};
window.handleLogout = window.handleSignOut;

// Prompt for 4-Digit Security PIN before sensitive actions
function requestPinAuthorization(title, description, onVerifiedCallback) {
    pendingPinCallback = onVerifiedCallback;
    const modal = document.getElementById('kira-pin-modal');
    const titleEl = document.getElementById('pin-modal-title');
    const descEl = document.getElementById('pin-modal-desc');
    const inputEl = document.getElementById('pin-modal-input');
    const errEl = document.getElementById('pin-modal-error');

    if (titleEl) titleEl.textContent = title || 'Approve Transaction';
    if (descEl) descEl.textContent = description || 'Enter your 4-digit Wallet PIN';
    if (errEl) errEl.textContent = '';
    if (inputEl) {
        inputEl.value = '';
        setTimeout(() => inputEl.focus(), 50);
    }
    modal?.classList.remove('hidden');
}

window.closePinModal = function() {
    pendingPinCallback = null;
    document.getElementById('kira-pin-modal')?.classList.add('hidden');
};

window.confirmPinModal = async function(e) {
    e.preventDefault();
    const enteredPin = document.getElementById('pin-modal-input')?.value.trim();
    const errEl = document.getElementById('pin-modal-error');
    const expectedPin = currentProfile?.admin_pin || currentUser?.user_metadata?.admin_pin || '1234';

    if (enteredPin !== expectedPin) {
        if (errEl) errEl.textContent = 'Incorrect Wallet PIN. Please try again.';
        return;
    }

    const cb = pendingPinCallback;
    closePinModal();
    if (typeof cb === 'function') {
        await cb();
    }
};

// ============================================================================
// 2. FAULT-TOLERANT USER PROVISIONING & DATA LOADER
// ============================================================================
async function ensureStarterDataForUser() {
    if (!currentUser) return;

    const metaName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
    const metaPin = currentUser.user_metadata?.admin_pin || '1234';

    // 1. Ensure user_profiles row exists
    const { data: existingProf } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (!existingProf) {
        await supabase.from('user_profiles').insert([{
            id: currentUser.id,
            full_name: metaName,
            email: currentUser.email,
            admin_pin: metaPin
        }]);
    }

    // 2. Ensure starter BNPL accounts exist for this user
    const { data: existingAccs } = await supabase
        .from('bnpl_accounts')
        .select('id')
        .eq('user_id', currentUser.id)
        .limit(1);

    if (!existingAccs || existingAccs.length === 0) {
        const today = new Date();
        const addDays = (d) => {
            const dt = new Date(today);
            dt.setDate(dt.getDate() + d);
            return dt.toISOString().split('T')[0];
        };

        await supabase.from('bnpl_accounts').insert([
            { user_id: currentUser.id, provider: 'SPayLater', short_code: 'S', brand_class: 'bg-[#ee4d2d] text-white', outstanding_amount: 450, next_repayment_amount: 150, repayment_date: addDays(5), repayment_status: 'Upcoming', is_shariah: true, is_connected: true },
            { user_id: currentUser.id, provider: 'Atome', short_code: 'A', brand_class: 'bg-[#facc15] text-slate-900', outstanding_amount: 360, next_repayment_amount: 120, repayment_date: addDays(12), repayment_status: 'Upcoming', is_shariah: true, is_connected: true },
            { user_id: currentUser.id, provider: 'Grab PayLater', short_code: 'G', brand_class: 'bg-[#00b14f] text-white', outstanding_amount: 200, next_repayment_amount: 200, repayment_date: addDays(-2), repayment_status: 'Unpaid', is_shariah: true, is_connected: true },
            { user_id: currentUser.id, provider: "Touch 'n Go PayLater", short_code: 'T', brand_class: 'bg-[#0062eb] text-white', outstanding_amount: 0, next_repayment_amount: 0, repayment_date: addDays(18), repayment_status: 'Paid', is_shariah: true, is_connected: false },
            { user_id: currentUser.id, provider: 'hoolah', short_code: 'H', brand_class: 'bg-[#ff3366] text-white', outstanding_amount: 180, next_repayment_amount: 60, repayment_date: addDays(20), repayment_status: 'Upcoming', is_shariah: false, is_connected: false }
        ]);
    }

    // 3. Ensure user_budget row exists
    const { data: existingBudget } = await supabase
        .from('user_budget')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

    if (!existingBudget) {
        await supabase.from('user_budget').insert([
            { user_id: currentUser.id, income: 5000, expenses: 3200 }
        ]);
    }
}

async function loadAppData() {
    if (!currentUser || isFetchingData) return;
    isFetchingData = true;

    try {
        await ensureStarterDataForUser();

        const [profRes, accRes, budRes, dispRes] = await Promise.all([
            supabase.from('user_profiles').select('*').eq('id', currentUser.id).maybeSingle(),
            supabase.from('bnpl_accounts').select('*').eq('user_id', currentUser.id).order('outstanding_amount', { ascending: false }),
            supabase.from('user_budget').select('*').eq('user_id', currentUser.id).maybeSingle(),
            supabase.from('disputes').select('*').eq('user_id', currentUser.id).order('dispute_date', { ascending: false })
        ]);

        currentProfile = profRes.data || {
            full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
            admin_pin: currentUser.user_metadata?.admin_pin || '1234'
        };

        const userLabel = document.getElementById('kira-user-display');
        if (userLabel) {
            userLabel.textContent = currentProfile.full_name || currentUser.email;
        }

        if (!accRes.error) accountsData = accRes.data || [];
        if (budRes.data) budgetData = budRes.data;
        if (dispRes.data) disputesData = dispRes.data || [];

        renderAll();
    } catch (err) {
        console.error('Initialization error:', err);
    } finally {
        isFetchingData = false;
    }
}

function subscribeToRealtimeSync() {
    if (!currentUser || realtimeChannel) return;

    realtimeChannel = supabase
        .channel(`kira-sync-${currentUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bnpl_accounts', filter: `user_id=eq.${currentUser.id}` }, () => loadAppData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_budget', filter: `user_id=eq.${currentUser.id}` }, () => loadAppData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes', filter: `user_id=eq.${currentUser.id}` }, () => loadAppData())
        .subscribe();
}

// ============================================================================
// 3. RENDER ALL VIEWS (100% Preserved UI & Logic)
// ============================================================================
function renderAll() {
    const shariahOnly = document.getElementById('toggleShariah')?.checked || false;
    const connectedAccounts = accountsData.filter(a => a.is_connected && (!shariahOnly || a.is_shariah));

    renderHome(connectedAccounts);
    renderCalendar(connectedAccounts);
    renderInsights(connectedAccounts);
    renderBudget(connectedAccounts);
    renderMore();
    renderConsentCentre();
}

// --- VIEW 1: HOME ---
window.toggleBalanceMask = function() {
    isBalanceMasked = !isBalanceMasked;
    renderAll();
};

function renderHome(connected) {
    const listEl = document.getElementById('accounts-list');
    const emptyState = document.getElementById('home-empty-state');
    const overdueBanner = document.getElementById('overdue-alert-banner');
    const overdueTitle = document.getElementById('overdue-alert-title');
    
    const totalOutstanding = connected.reduce((sum, a) => sum + Number(a.outstanding_amount), 0);
    const totalValEl = document.getElementById('total-val');
    const activeCountEl = document.getElementById('active-count-val');
    if (totalValEl) totalValEl.textContent = displayMoney(totalOutstanding);
    if (activeCountEl) activeCountEl.textContent = connected.length;

    const overdueList = connected.filter(a => getDynamicStatus(a.repayment_status, a.repayment_date) === 'Unpaid');
    if (overdueList.length > 0) {
        overdueBanner?.classList.remove('hidden');
        if (overdueTitle) {
            overdueTitle.textContent = `${overdueList.length} Overdue Installment (${overdueList.map(o => o.provider).join(', ')})`;
        }
    } else {
        overdueBanner?.classList.add('hidden');
    }

    if (connected.length === 0) {
        emptyState?.classList.remove('hidden');
        if (listEl) listEl.innerHTML = '';
        return;
    }

    emptyState?.classList.add('hidden');
    if (!listEl) return;

    listEl.innerHTML = connected.map(acc => {
        const limit = CREDIT_LIMITS[acc.provider] || 1500;
        const usedPct = Math.min(100, Math.round((Number(acc.outstanding_amount) / limit) * 100));
        const barColor = usedPct > 75 ? 'bg-amber-500' : 'bg-[#0062eb]';

        return `
            <div onclick="switchTab('calendar')" class="flex flex-col justify-between bg-[#eef5ff] hover:bg-[#e4efff] p-4 md:p-5 rounded-2xl border border-blue-100/80 hover:border-blue-300 transition-all cursor-pointer shadow-xs space-y-3">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-3.5">
                        <div class="w-11 h-11 rounded-2xl ${acc.brand_class} flex items-center justify-center font-extrabold text-lg shadow-sm">${acc.short_code}</div>
                        <div>
                            <span class="block font-extrabold text-slate-800 text-sm md:text-base">${acc.provider}</span>
                            ${acc.is_shariah ? `<span class="text-[10px] text-emerald-700 font-bold bg-white border border-emerald-200/60 px-2 py-0.5 rounded-full inline-block mt-0.5">Compliant</span>` : ''}
                        </div>
                    </div>
                    <span class="font-black text-slate-900 text-base md:text-lg">RM ${displayMoney(acc.outstanding_amount)}</span>
                </div>
                <div>
                    <div class="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Credit Used (${usedPct}%)</span>
                        <span>Limit: RM ${displayMoney(limit)}</span>
                    </div>
                    <div class="w-full bg-white rounded-full h-1.5 overflow-hidden">
                        <div class="${barColor} h-full rounded-full" style="width: ${usedPct}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- VIEW 2: CALENDAR ---
window.changeMonth = function(offset) {
    currentCalMonth += offset;
    selectedCalDay = null;
    if (currentCalMonth > 11) {
        currentCalMonth = 0;
        currentCalYear++;
    } else if (currentCalMonth < 0) {
        currentCalMonth = 11;
        currentCalYear--;
    }
    const shariahOnly = document.getElementById('toggleShariah')?.checked || false;
    const connectedAccounts = accountsData.filter(a => a.is_connected && (!shariahOnly || a.is_shariah));
    renderCalendar(connectedAccounts);
};

window.selectCalendarDay = function(day) {
    selectedCalDay = (selectedCalDay === day) ? null : day;
    const shariahOnly = document.getElementById('toggleShariah')?.checked || false;
    const connectedAccounts = accountsData.filter(a => a.is_connected && (!shariahOnly || a.is_shariah));
    renderCalendar(connectedAccounts);
};

function renderCalendar(connected) {
    renderCalendarGrid(connected);

    const emptyState = document.getElementById('calendar-empty-state');
    const listEl = document.getElementById('calendar-events-list');
    const clearBtn = document.getElementById('clear-date-filter-btn');

    if (clearBtn) {
        clearBtn.classList.toggle('hidden', selectedCalDay === null);
        if (selectedCalDay !== null) {
            clearBtn.innerHTML = `Filtered: Day ${selectedCalDay} &times;`;
        }
    }

    if (connected.length === 0) {
        emptyState?.classList.remove('hidden');
        if (listEl) listEl.innerHTML = '';
        return;
    }

    emptyState?.classList.add('hidden');

    let monthEvents = [];
    connected.forEach(acc => {
        if (!acc.repayment_date) return;
        const [origY, origM, origD] = acc.repayment_date.split('-').map(Number);
        const originalMonthIndex = origM - 1;

        if (currentCalYear === origY && currentCalMonth === originalMonthIndex) {
            monthEvents.push({
                ...acc,
                dayNum: origD,
                displayDate: acc.repayment_date,
                status: getDynamicStatus(acc.repayment_status, acc.repayment_date)
            });
        } else if (
            (currentCalYear > origY || (currentCalYear === origY && currentCalMonth > originalMonthIndex)) &&
            Number(acc.outstanding_amount) > Number(acc.next_repayment_amount)
        ) {
            const projectedDate = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(origD).padStart(2, '0')}`;
            monthEvents.push({
                ...acc,
                dayNum: origD,
                displayDate: projectedDate,
                status: 'Upcoming'
            });
        }
    });

    if (selectedCalDay !== null) {
        monthEvents = monthEvents.filter(e => e.dayNum === selectedCalDay);
    }

    if (listEl) {
        if (monthEvents.length === 0) {
            listEl.innerHTML = `
                <div class="bg-[#eef5ff] border border-blue-100/70 p-6 rounded-2xl text-center text-xs text-slate-500 font-medium">
                    No installments scheduled for ${selectedCalDay ? `day ${selectedCalDay}` : 'this month'}.
                </div>
            `;
            return;
        }

        listEl.innerHTML = monthEvents.map(acc => {
            const isPaid = acc.status === 'Paid';
            const badgeColors = {
                'Unpaid': 'bg-red-100 text-red-700 border border-red-200/50',
                'Upcoming': 'bg-amber-100 text-amber-700 border border-amber-200/50',
                'Paid': 'bg-emerald-100 text-emerald-700 border border-emerald-200/50'
            }[acc.status] || 'bg-slate-100 text-slate-700';

            return `
                <div class="flex justify-between items-center bg-[#eef5ff] hover:bg-[#e4efff] p-4 md:p-5 rounded-2xl border border-blue-100/80 transition-all shadow-xs">
                    <div class="flex items-center gap-3.5">
                        <div class="w-11 h-11 rounded-2xl ${acc.brand_class} flex items-center justify-center font-extrabold text-lg shadow-sm">${acc.short_code}</div>
                        <div>
                            <p class="font-extrabold text-slate-800 text-sm md:text-base">${acc.provider}</p>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-xs font-semibold text-slate-500">${formatDate(acc.displayDate)}</span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColors} uppercase tracking-wide">${acc.status}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right flex flex-col items-end gap-1.5">
                        <p class="font-black ${isPaid ? 'text-slate-400 line-through' : 'text-slate-900'} text-base md:text-lg">
                            RM ${displayMoney(acc.next_repayment_amount)}
                        </p>
                        ${!isPaid ? `
                            <button onclick="payInstallment('${acc.id}')" class="px-3.5 py-1 rounded-full bg-[#0062eb] hover:bg-blue-700 text-white text-[10px] font-bold shadow-xs transition active:scale-95">
                                Pay Now
                            </button>
                        ` : `<span class="text-[10px] font-bold text-emerald-600">Settled ✓</span>`}
                    </div>
                </div>
            `;
        }).join('');
    }
}

function renderCalendarGrid(connected) {
    const monthYearEl = document.getElementById('calendar-month-year');
    const gridEl = document.getElementById('calendar-grid');
    if (!monthYearEl || !gridEl) return;

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    monthYearEl.textContent = `${monthNames[currentCalMonth]} ${currentCalYear}`;

    const firstDayIndex = new Date(currentCalYear, currentCalMonth, 1).getDay();
    const startOffset = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();

    const eventsByDay = {};
    connected.forEach(acc => {
        if (!acc.repayment_date) return;
        const [origY, origM, origD] = acc.repayment_date.split('-').map(Number);
        const originalMonthIndex = origM - 1;

        const isExactMonth = (origY === currentCalYear && originalMonthIndex === currentCalMonth);
        const isFutureMonthWithBalance = (
            (currentCalYear > origY || (currentCalYear === origY && currentCalMonth > originalMonthIndex)) &&
            Number(acc.outstanding_amount) > Number(acc.next_repayment_amount)
        );

        if (isExactMonth) {
            if (!eventsByDay[origD]) eventsByDay[origD] = [];
            eventsByDay[origD].push({ 
                ...acc, 
                status: getDynamicStatus(acc.repayment_status, acc.repayment_date) 
            });
        } else if (isFutureMonthWithBalance) {
            if (!eventsByDay[origD]) eventsByDay[origD] = [];
            eventsByDay[origD].push({ ...acc, status: 'Upcoming' });
        }
    });

    const today = new Date();
    let cellsHTML = '';

    for (let i = 0; i < startOffset; i++) {
        cellsHTML += `<div class="h-8"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayEvents = eventsByDay[day] || [];
        const isToday = (
            today.getFullYear() === currentCalYear &&
            today.getMonth() === currentCalMonth &&
            today.getDate() === day
        );
        const isSelected = selectedCalDay === day;

        let circleStyle = 'text-slate-700 hover:bg-[#eef5ff] cursor-pointer';
        let dotColor = '';

        if (dayEvents.length > 0) {
            const hasUnpaid = dayEvents.some(e => e.status === 'Unpaid');
            const hasUpcoming = dayEvents.some(e => e.status === 'Upcoming');

            if (hasUnpaid) {
                circleStyle = 'border-2 border-red-500 text-red-600 font-bold bg-red-50/50 cursor-pointer';
                dotColor = 'bg-red-500';
            } else if (hasUpcoming) {
                circleStyle = 'border-2 border-amber-500 text-amber-700 font-bold bg-amber-50/50 cursor-pointer';
                dotColor = 'bg-amber-500';
            } else {
                circleStyle = 'border-2 border-emerald-500 text-emerald-700 font-bold bg-emerald-50/50 cursor-pointer';
                dotColor = 'bg-emerald-500';
            }
        } else if (isToday) {
            circleStyle = 'bg-[#0062eb] text-white font-bold shadow-md shadow-blue-500/30 cursor-pointer';
        }

        if (isSelected) {
            circleStyle += ' ring-2 ring-offset-1 ring-[#0062eb]';
        }

        cellsHTML += `
            <div onclick="selectCalendarDay(${day})" class="h-8 flex flex-col items-center justify-center">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${circleStyle}">
                    ${day}
                </div>
                ${dotColor ? `<span class="w-1 h-1 rounded-full ${dotColor} mt-0.5"></span>` : `<span class="w-1 h-1 mt-0.5"></span>`}
            </div>
        `;
    }

    gridEl.innerHTML = cellsHTML;
}

// --- SUPABASE: PIN-PROTECTED 1-TAP PAY NOW & PAY ALL DUE ---
async function executeSinglePayment(acc) {
    const paidAmount = Number(acc.next_repayment_amount);
    const newOutstanding = Math.max(0, Number(acc.outstanding_amount) - paidAmount);

    // Pass raw UUID string (acc.id) to RPC
    const { error: rpcError } = await supabase.rpc('settle_bnpl_installment', {
        p_account_id: acc.id
    });

    if (rpcError) {
        const { error: updateErr } = await supabase
            .from('bnpl_accounts')
            .update({
                repayment_status: 'Paid',
                outstanding_amount: newOutstanding
            })
            .eq('id', acc.id)
            .eq('user_id', currentUser.id);

        if (updateErr) {
            showToast(`Payment error: ${updateErr.message}`);
            return false;
        }

        await supabase.from('payment_history').insert([{
            user_id: currentUser.id,
            account_id: acc.id,
            provider: acc.provider,
            amount_paid: paidAmount
        }]);
    }

    acc.repayment_status = 'Paid';
    acc.outstanding_amount = newOutstanding;
    return true;
}

window.payInstallment = function(id) {
    const acc = accountsData.find(a => String(a.id) === String(id));
    if (!acc) return;

    const paidAmount = Number(acc.next_repayment_amount);
    requestPinAuthorization(
        `Pay ${acc.provider}`,
        `Approve instant payment of RM ${formatRM(paidAmount)}`,
        async () => {
            const ok = await executeSinglePayment(acc);
            if (ok) {
                showToast(`Paid RM ${formatRM(paidAmount)} to ${acc.provider}!`);
                renderAll();
            }
        }
    );
};

window.payAllDueInstallments = function() {
    const dueAccounts = accountsData.filter(a => a.is_connected && getDynamicStatus(a.repayment_status, a.repayment_date) !== 'Paid');
    if (dueAccounts.length === 0) {
        showToast('All connected accounts are already settled!');
        return;
    }

    const totalToSettle = dueAccounts.reduce((s, a) => s + Number(a.next_repayment_amount), 0);
    requestPinAuthorization(
        'Settle All Due Installments',
        `Approve RM ${formatRM(totalToSettle)} across ${dueAccounts.length} providers`,
        async () => {
            let totalSettled = 0;
            for (const acc of dueAccounts) {
                const ok = await executeSinglePayment(acc);
                if (ok) totalSettled += Number(acc.next_repayment_amount);
            }
            showToast(`Settled RM ${formatRM(totalSettled)} across ${dueAccounts.length} providers!`);
            renderAll();
        }
    );
};

// --- VIEW 3: INSIGHTS ---
function renderInsights(connected) {
    const emptyState = document.getElementById('insights-empty-state');
    const content = document.getElementById('insights-content');
    const listEl = document.getElementById('insights-status-list');

    if (connected.length === 0) {
        emptyState?.classList.remove('hidden');
        content?.classList.add('hidden');
        return;
    }

    emptyState?.classList.add('hidden');
    content?.classList.remove('hidden');

    const totalOutstanding = connected.reduce((sum, a) => sum + Number(a.outstanding_amount), 0);
    const chartTotalEl = document.getElementById('chart-total-val');
    if (chartTotalEl) chartTotalEl.textContent = displayMoney(totalOutstanding);

    if (listEl) {
        listEl.innerHTML = connected.map(acc => {
            const computedStatus = getDynamicStatus(acc.repayment_status, acc.repayment_date);
            const isPaid = computedStatus === 'Paid';
            return `
                <div class="flex justify-between items-center bg-[#eef5ff] hover:bg-[#e4efff] p-4 md:p-5 rounded-2xl border border-blue-100/80 transition-all shadow-xs">
                    <div class="flex items-center gap-3.5">
                        <div class="w-11 h-11 rounded-2xl ${acc.brand_class} flex items-center justify-center font-extrabold text-lg shadow-sm">${acc.short_code}</div>
                        <div>
                            <p class="font-extrabold text-slate-800 text-sm md:text-base">${acc.provider}</p>
                            <p class="text-xs font-semibold text-slate-500">${isPaid ? 'Paid on' : 'Due'} ${formatDate(acc.repayment_date)}</p>
                        </div>
                    </div>
                    <div class="text-right flex items-center gap-3">
                        <span class="text-base md:text-lg font-black ${isPaid ? 'text-slate-400 line-through' : 'text-slate-900'}">RM ${displayMoney(acc.next_repayment_amount)}</span>
                        ${!isPaid ? `<button onclick="payInstallment('${acc.id}')" class="px-3 py-1 rounded-full bg-[#0062eb] text-white text-[10px] font-bold hover:bg-blue-700 transition">Pay</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    updateChart(connected);
}

function updateChart(connected) {
    const ctx = document.getElementById('spendingChart')?.getContext('2d');
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: connected.map(a => a.provider),
            datasets: [{
                data: connected.map(a => Number(a.outstanding_amount)),
                backgroundColor: ['#ee4d2d', '#facc15', '#00b14f', '#0062eb', '#ff3366'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '75%',
            plugins: { legend: { display: false } },
            maintainAspectRatio: false
        }
    });
}

// --- VIEW 4: BUDGET & PRE-PURCHASE SIMULATOR ---
window.setSimTenure = function(months) {
    simTenure = months;
    [3, 6, 12].forEach(m => {
        const btn = document.getElementById(`tenure-btn-${m}`);
        if (btn) {
            btn.className = (m === months)
                ? 'px-3 py-1 rounded-lg text-xs font-bold bg-[#0062eb] text-white'
                : 'px-3 py-1 rounded-lg text-xs font-bold bg-white text-slate-600 border border-blue-200';
        }
    });
    updateSimulator();
};

window.resetSimulator = function() {
    const slider = document.getElementById('sim-price-slider');
    if (slider) slider.value = 0;
    setSimTenure(3);
};

window.updateSimulator = function() {
    const shariahOnly = document.getElementById('toggleShariah')?.checked || false;
    const connectedAccounts = accountsData.filter(a => a.is_connected && (!shariahOnly || a.is_shariah));
    renderBudget(connectedAccounts);
};

function renderBudget(connected) {
    const income = Number(budgetData.income) || 1;
    const expenses = Number(budgetData.expenses) || 0;
    const baseRepayments = connected
        .filter(a => getDynamicStatus(a.repayment_status, a.repayment_date) !== 'Paid')
        .reduce((sum, a) => sum + Number(a.next_repayment_amount), 0);

    const simPrice = Number(document.getElementById('sim-price-slider')?.value || 0);
    const simMonthlyAdd = simPrice / simTenure;

    const simPriceLabel = document.getElementById('sim-price-label');
    const simMonthlyEl = document.getElementById('sim-monthly-add');
    if (simPriceLabel) simPriceLabel.textContent = simPrice;
    if (simMonthlyEl) simMonthlyEl.textContent = formatRM(simMonthlyAdd);

    const activeRepayments = baseRepayments + simMonthlyAdd;
    const remaining = income - expenses - activeRepayments;
    const totalImpactPct = Math.min(100, Math.round(((expenses + activeRepayments) / income) * 100));
    const expPct = Math.min(100, Math.round((expenses / income) * 100));
    const bnplPct = Math.min(100, Math.round((activeRepayments / income) * 100));

    const incEl = document.getElementById('budget-income-val');
    const expEl = document.getElementById('budget-expenses-val');
    const bnplEl = document.getElementById('budget-bnpl-val');
    const remEl = document.getElementById('budget-remain-val');
    if (incEl) incEl.textContent = displayMoney(income);
    if (expEl) expEl.textContent = displayMoney(expenses);
    if (bnplEl) bnplEl.textContent = displayMoney(activeRepayments);
    if (remEl) remEl.textContent = displayMoney(remaining);

    const expBar = document.getElementById('budget-expenses-bar');
    const bnplBar = document.getElementById('budget-bnpl-bar');
    if (expBar) expBar.style.width = `${expPct}%`;
    if (bnplBar) bnplBar.style.width = `${bnplPct}%`;
    
    const impactBar = document.getElementById('impact-bar');
    const impactPctEl = document.getElementById('impact-percent');
    const titleEl = document.getElementById('budget-status-title');
    const descEl = document.getElementById('budget-status-desc');

    if (impactBar) impactBar.style.width = `${totalImpactPct}%`;
    if (impactPctEl) impactPctEl.textContent = `${totalImpactPct}%`;

    if (totalImpactPct > 80) {
        if (impactBar) impactBar.className = 'bg-red-500 h-full rounded-full transition-all duration-500';
        if (impactPctEl) impactPctEl.className = 'text-red-600 font-black text-base';
        if (titleEl) titleEl.textContent = '⚠️ High Debt Risk';
        if (descEl) descEl.textContent = 'Commitments exceed 80% of income. Delay new BNPL purchases.';
    } else if (totalImpactPct >= 65) {
        if (impactBar) impactBar.className = 'bg-amber-500 h-full rounded-full transition-all duration-500';
        if (impactPctEl) impactPctEl.className = 'text-amber-600 font-black text-base';
        if (titleEl) titleEl.textContent = 'Moderate Commitment';
        if (descEl) descEl.textContent = 'Your budget is manageable, but watch out for additional installments.';
    } else {
        if (impactBar) impactBar.className = 'bg-[#0062eb] h-full rounded-full transition-all duration-500';
        if (impactPctEl) impactPctEl.className = 'text-[#0062eb] font-black text-base';
        if (titleEl) titleEl.textContent = 'Financial Health: Good';
        if (descEl) descEl.textContent = 'Your current installment obligations remain well within recommended bounds.';
    }
}

window.openBudgetModal = function() {
    document.getElementById('input-budget-income').value = budgetData.income;
    document.getElementById('input-budget-expenses').value = budgetData.expenses;
    document.getElementById('modal-budget').classList.remove('hidden');
};

window.closeBudgetModal = function() {
    document.getElementById('modal-budget').classList.add('hidden');
};

window.saveBudget = async function(e) {
    e.preventDefault();
    if (!currentUser) return;

    const newIncome = Number(document.getElementById('input-budget-income').value);
    const newExpenses = Number(document.getElementById('input-budget-expenses').value);

    const { data, error } = await supabase
        .from('user_budget')
        .upsert(
            { user_id: currentUser.id, income: newIncome, expenses: newExpenses },
            { onConflict: 'user_id' }
        )
        .select()
        .single();

    if (!error) {
        if (data) budgetData = data;
        else {
            budgetData.income = newIncome;
            budgetData.expenses = newExpenses;
        }
        closeBudgetModal();
        showToast('Monthly budget updated!');
        renderAll();
    } else {
        showToast(`Error saving budget: ${error.message}`);
    }
};

// --- VIEW 5: MORE & SUBMIT NEW DISPUTE MODAL ---
function renderMore() {
    const listEl = document.getElementById('disputes-list');
    if (!listEl) return;

    if (disputesData.length === 0) {
        listEl.innerHTML = `
            <div class="bg-[#eef5ff] border border-blue-100/70 p-5 rounded-2xl text-center text-xs text-slate-500 font-medium">
                No active merchant disputes filed yet.
            </div>
        `;
        return;
    }

    listEl.innerHTML = disputesData.map(d => `
        <div class="flex justify-between items-center p-4 md:p-5 bg-[#eef5ff] rounded-2xl border border-blue-100/80">
            <div>
                <p class="font-extrabold text-slate-800 text-sm md:text-base">${d.merchant}</p>
                <p class="text-xs text-slate-500 mt-0.5">${formatDate(d.dispute_date)}</p>
            </div>
            <div class="text-right">
                <p class="font-black text-slate-900 text-base md:text-lg">RM ${displayMoney(d.amount)}</p>
                <span class="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full inline-block mt-0.5">${d.status}</span>
            </div>
        </div>
    `).join('');
}

window.openDisputeModal = function() {
    document.getElementById('input-dispute-merchant').value = '';
    document.getElementById('input-dispute-amount').value = '';
    document.getElementById('modal-dispute').classList.remove('hidden');
};

window.closeDisputeModal = function() {
    document.getElementById('modal-dispute').classList.add('hidden');
};

window.submitDispute = async function(e) {
    e.preventDefault();
    if (!currentUser) return;

    const merchant = document.getElementById('input-dispute-merchant').value.trim();
    const amount = Number(document.getElementById('input-dispute-amount').value);
    const status = document.getElementById('input-dispute-status').value;
    const todayIso = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('disputes')
        .insert([{ user_id: currentUser.id, merchant, amount, status, dispute_date: todayIso }])
        .select()
        .single();

    if (!error && data) {
        disputesData.unshift(data);
        closeDisputeModal();
        showToast(`Dispute filed for ${merchant}!`);
        renderMore();
    } else if (error) {
        showToast(`Failed to file dispute: ${error.message}`);
    }
};

// --- VIEW 6: CONSENT CENTRE ---
function renderConsentCentre() {
    const listEl = document.getElementById('consent-list');
    if (!listEl) return;
    listEl.innerHTML = accountsData.map(acc => `
        <div class="flex justify-between items-center bg-[#eef5ff] p-5 rounded-2xl border border-blue-100/80 hover:border-blue-300 transition-all shadow-xs">
            <div class="flex items-center gap-3.5">
                <div class="w-11 h-11 rounded-2xl ${acc.brand_class} flex items-center justify-center font-extrabold text-xl shadow-sm">${acc.short_code}</div>
                <div>
                    <span class="font-extrabold text-slate-800 text-sm md:text-base block">${acc.provider}</span>
                    <span class="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Open Finance API</span>
                </div>
            </div>
            <button onclick="toggleAccountConnection('${acc.id}', ${acc.is_connected})" 
                class="px-5 py-2 rounded-full text-xs font-bold transition-all active:scale-95 shadow-xs ${
                    acc.is_connected 
                    ? 'bg-emerald-500 text-white hover:bg-red-500' 
                    : 'bg-[#0062eb] text-white hover:bg-blue-700'
                }">
                ${acc.is_connected ? 'Connected ✓' : 'Connect'}
            </button>
        </div>
    `).join('');
}

window.toggleAccountConnection = function(id, currentState) {
    const item = accountsData.find(a => String(a.id) === String(id));
    if (!item) return;

    const newState = !currentState;
    requestPinAuthorization(
        newState ? `Connect ${item.provider}` : `Disconnect ${item.provider}`,
        `Enter your 4-digit PIN to ${newState ? 'fetch bills via Open Finance API' : 'revoke access'}`,
        async () => {
            // Restore demo balances when connecting, zero them out when disconnecting
            const restoredAmounts = {
                'SPayLater': { out: 450.00, next: 150.00 },
                'Atome': { out: 360.00, next: 120.00 },
                'Grab PayLater': { out: 200.00, next: 200.00 },
                "Touch 'n Go PayLater": { out: 120.00, next: 40.00 },
                'hoolah': { out: 180.00, next: 60.00 }
            };

            const defaults = restoredAmounts[item.provider] || { out: 250.00, next: 80.00 };
            const newOutstanding = newState ? defaults.out : 0.00;
            const newNextRepayment = newState ? defaults.next : 0.00;
            const newStatus = newState ? 'Upcoming' : 'Paid';

            const { error } = await supabase
                .from('bnpl_accounts')
                .update({ 
                    is_connected: newState,
                    outstanding_amount: newOutstanding,
                    next_repayment_amount: newNextRepayment,
                    repayment_status: newStatus
                })
                .eq('id', item.id)
                .eq('user_id', currentUser.id);

            if (!error) {
                item.is_connected = newState;
                item.outstanding_amount = newOutstanding;
                item.next_repayment_amount = newNextRepayment;
                item.repayment_status = newStatus;

                showToast(newState ? `Successfully synced bills from ${item.provider}!` : `Disconnected ${item.provider}.`);
                renderAll();
            } else {
                showToast(`Connection error: ${error.message}`);
            }
        }
    );
};

window.filterShariah = function() {
    renderAll();
};

window.switchTab = function(tab) {
    const views = ['home', 'calendar', 'insights', 'budget', 'more', 'consent'];
    views.forEach(v => {
        document.getElementById(`view-${v}`)?.classList.toggle('hidden', v !== tab);
    });

    document.getElementById('scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });

    const activeNav = tab === 'consent' ? 'more' : tab;
    ['home', 'calendar', 'insights', 'budget', 'more'].forEach(nav => {
        const isCurrent = nav === activeNav;
        
        const deskBtn = document.getElementById(`desktop-nav-${nav}`);
        if (deskBtn) {
            deskBtn.className = isCurrent
                ? 'w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-blue-50 text-[#0062eb] font-bold transition-all'
                : 'w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-bold transition-all';
        }

        const mobBtn = document.getElementById(`mobile-nav-${nav}`);
        if (mobBtn) {
            mobBtn.className = isCurrent
                ? 'flex flex-col items-center gap-1 text-[#0062eb] flex-1 py-1 transition-all'
                : 'flex flex-col items-center gap-1 text-slate-400 flex-1 py-1 transition-all';
        }
    });
};

// ============================================================================
// 4. BOOTSTRAP AUTHENTICATION (Non-Blocking Supabase v2 Pattern)
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    injectAuthAndSecurityUI();

    const authOverlay = document.getElementById('kira-auth-overlay');
    const sessionPill = document.getElementById('kira-session-pill');

    // Check active session on page load
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        currentUser = session.user;
        authOverlay?.classList.add('hidden');
        sessionPill?.classList.remove('hidden');
        await loadAppData();
        subscribeToRealtimeSync();
    } else {
        authOverlay?.classList.remove('hidden');
        sessionPill?.classList.add('hidden');
    }

    // IMPORTANT: Defer async Supabase queries with setTimeout(..., 0) to prevent Supabase v2 lock deadlocks
    supabase.auth.onAuthStateChange((_event, newSession) => {
        if (newSession?.user) {
            const isNewUserLogin = !currentUser || currentUser.id !== newSession.user.id;
            currentUser = newSession.user;
            authOverlay?.classList.add('hidden');
            sessionPill?.classList.remove('hidden');
            if (isNewUserLogin) {
                setTimeout(() => {
                    loadAppData();
                    subscribeToRealtimeSync();
                }, 0);
            }
        } else {
            currentUser = null;
            currentProfile = null;
            accountsData = [];
            disputesData = [];
            authOverlay?.classList.remove('hidden');
            sessionPill?.classList.add('hidden');
        }
    });
});