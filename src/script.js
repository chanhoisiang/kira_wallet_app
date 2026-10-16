import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1. Initialize Supabase (Replace with your project URL & Anon Key)
const SUPABASE_URL = 'https://mqlsvfzsavioppmejuze.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbHN2ZnpzYXZpb3BwbWVqdXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNTUxNzAsImV4cCI6MjEwNzYzMTE3MH0.eN9XQ3Ecw40N0XemfB0WV_1qXsVWOCzztwlIfhdVUMo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global State
let accountsData = [];
let budgetData = { id: 1, income: 5000, expenses: 3200 };
let disputesData = [];
let chartInstance = null;

// Interactive UI State
let isBalanceMasked = false;
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let selectedCalDay = null; // For interactive calendar date filtering
let simTenure = 3;         // For pre-purchase BNPL simulator

// Default Credit Limits per Provider (for utilization bars)
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

// 2. Load All Data from Supabase
async function loadAppData() {
    try {
        const [accRes, budRes, dispRes] = await Promise.all([
            supabase.from('bnpl_accounts').select('*').order('outstanding_amount', { ascending: false }),
            supabase.from('user_budget').select('*').single(),
            supabase.from('disputes').select('*').order('dispute_date', { ascending: false })
        ]);

        if (accRes.error) console.error('Supabase bnpl_accounts error:', accRes.error.message);
        else accountsData = accRes.data || [];

        if (budRes.data) budgetData = budRes.data;
        if (dispRes.data) disputesData = dispRes.data || [];

        renderAll();
    } catch (err) {
        console.error('Initialization error:', err);
    }
}

// 3. Render All Views
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

// --- VIEW 1: HOME (with Privacy Mask, Overdue Banner & Credit Utilization Bars) ---
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
    document.getElementById('total-val').textContent = displayMoney(totalOutstanding);
    document.getElementById('active-count-val').textContent = connected.length;

    // Check for overdue accounts
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

// --- VIEW 2: CALENDAR (Interactive Day Filter + 1-Tap Pay Now) ---
window.changeMonth = function(offset) {
    currentCalMonth += offset;
    selectedCalDay = null; // Reset day filter on month change
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

// --- SUPABASE: 1-TAP PAY NOW & PAY ALL DUE ---
window.payInstallment = async function(id) {
    const acc = accountsData.find(a => a.id === id);
    if (!acc) return;

    const paidAmount = Number(acc.next_repayment_amount);
    const newOutstanding = Math.max(0, Number(acc.outstanding_amount) - paidAmount);

    const { error } = await supabase
        .from('bnpl_accounts')
        .update({ 
            repayment_status: 'Paid',
            outstanding_amount: newOutstanding
        })
        .eq('id', id);

    if (!error) {
        acc.repayment_status = 'Paid';
        acc.outstanding_amount = newOutstanding;
        showToast(`Paid RM ${formatRM(paidAmount)} to ${acc.provider}!`);
        renderAll();
    }
};

window.payAllDueInstallments = async function() {
    const dueAccounts = accountsData.filter(a => a.is_connected && getDynamicStatus(a.repayment_status, a.repayment_date) !== 'Paid');
    if (dueAccounts.length === 0) {
        showToast('All connected accounts are already settled!');
        return;
    }

    let totalSettled = 0;
    for (const acc of dueAccounts) {
        const paidAmt = Number(acc.next_repayment_amount);
        const newOut = Math.max(0, Number(acc.outstanding_amount) - paidAmt);
        const { error } = await supabase
            .from('bnpl_accounts')
            .update({ repayment_status: 'Paid', outstanding_amount: newOut })
            .eq('id', acc.id);
        if (!error) {
            acc.repayment_status = 'Paid';
            acc.outstanding_amount = newOut;
            totalSettled += paidAmt;
        }
    }

    showToast(`Settled RM ${formatRM(totalSettled)} across ${dueAccounts.length} providers!`);
    renderAll();
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
    document.getElementById('chart-total-val').textContent = displayMoney(totalOutstanding);

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

    // Add Simulated Pre-Purchase Installment
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

    document.getElementById('budget-income-val').textContent = displayMoney(income);
    document.getElementById('budget-expenses-val').textContent = displayMoney(expenses);
    document.getElementById('budget-bnpl-val').textContent = displayMoney(activeRepayments);
    document.getElementById('budget-remain-val').textContent = displayMoney(remaining);

    document.getElementById('budget-expenses-bar').style.width = `${expPct}%`;
    document.getElementById('budget-bnpl-bar').style.width = `${bnplPct}%`;
    
    const impactBar = document.getElementById('impact-bar');
    const impactPctEl = document.getElementById('impact-percent');
    const titleEl = document.getElementById('budget-status-title');
    const descEl = document.getElementById('budget-status-desc');

    if (impactBar) impactBar.style.width = `${totalImpactPct}%`;
    if (impactPctEl) impactPctEl.textContent = `${totalImpactPct}%`;

    // Dynamic Risk Assessment Styling
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

// Editable Budget Modal Handlers (Supabase Update)
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
    const newIncome = Number(document.getElementById('input-budget-income').value);
    const newExpenses = Number(document.getElementById('input-budget-expenses').value);

    const { error } = await supabase
        .from('user_budget')
        .update({ income: newIncome, expenses: newExpenses })
        .eq('id', budgetData.id || 1);

    if (!error) {
        budgetData.income = newIncome;
        budgetData.expenses = newExpenses;
        closeBudgetModal();
        showToast('Monthly budget updated in Supabase!');
        renderAll();
    }
};

// --- VIEW 5: MORE & SUBMIT NEW DISPUTE MODAL (Supabase Insert) ---
function renderMore() {
    const listEl = document.getElementById('disputes-list');
    if (!listEl) return;
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
    const merchant = document.getElementById('input-dispute-merchant').value.trim();
    const amount = Number(document.getElementById('input-dispute-amount').value);
    const status = document.getElementById('input-dispute-status').value;
    const todayIso = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('disputes')
        .insert([{ merchant, amount, status, dispute_date: todayIso }])
        .select()
        .single();

    if (!error && data) {
        disputesData.unshift(data);
        closeDisputeModal();
        showToast(`Dispute filed for ${merchant}!`);
        renderMore();
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

window.toggleAccountConnection = async function(id, currentState) {
    const newState = !currentState;
    const { error } = await supabase
        .from('bnpl_accounts')
        .update({ is_connected: newState })
        .eq('id', id);

    if (!error) {
        const item = accountsData.find(a => a.id === id);
        if (item) item.is_connected = newState;
        showToast(newState ? `${item.provider} connected!` : `${item.provider} disconnected!`);
        renderAll();
    }
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

document.addEventListener('DOMContentLoaded', loadAppData);