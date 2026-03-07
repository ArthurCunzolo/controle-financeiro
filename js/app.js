/**
 * app.js — Main Application Controller (i18n)
 */

const App = {
    currentPage: 'dashboard',

    async init() {
        await storage.init();
        this.updateLoginLabels();
        this.renderLoginLangSwitch();
        const session = await Auth.init();

        if (session) {
            Auth.showApp();
            await this.onLogin();
        } else {
            Auth.showLoginPage();
        }
    },

    /** Update login screen labels based on current language */
    updateLoginLabels() {
        const el = (id) => document.getElementById(id);
        if (el('login-subtitle')) el('login-subtitle').textContent = t('app_subtitle_full');
        if (el('login-label-user')) el('login-label-user').textContent = t('login_username');
        if (el('login-label-pass')) el('login-label-pass').textContent = t('login_password');
        if (el('login-username')) el('login-username').placeholder = t('login_username_placeholder');
        if (el('login-password')) el('login-password').placeholder = t('login_password_placeholder');
        if (el('login-submit')) el('login-submit').textContent = t('login_submit');
        if (el('login-footer-text')) el('login-footer-text').textContent = t('secure_client_side');
        if (el('global-search')) el('global-search').placeholder = t('quick_search');
    },

    /** Render language switch on login page */
    renderLoginLangSwitch() {
        const container = document.getElementById('login-lang-switch');
        if (!container) return;
        container.innerHTML = `
            <select class="login-lang-selector" onchange="App.changeLanguageLogin(this.value)">
                <option value="en" ${i18n.getLang() === 'en' ? 'selected' : ''}>🇺🇸 English</option>
                <option value="pt" ${i18n.getLang() === 'pt' ? 'selected' : ''}>🇧🇷 Português</option>
            </select>
        `;
    },

    /** Change language from login page */
    changeLanguageLogin(lang) {
        i18n.setLang(lang);
        this.updateLoginLabels();
        this.renderLoginLangSwitch();
    },

    /** Change language from sidebar — re-render entire app */
    async changeLanguage(lang) {
        i18n.setLang(lang);
        document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
        if (document.getElementById('global-search')) {
            document.getElementById('global-search').placeholder = t('quick_search');
        }
        Sidebar.render();
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        await this.navigate(hash);
    },

    async onLogin() {
        Sidebar.render();
        this.loadTheme();
        this.setupRouter();
        document.documentElement.lang = i18n.getLang() === 'pt' ? 'pt-BR' : 'en';
        if (document.getElementById('global-search')) {
            document.getElementById('global-search').placeholder = t('quick_search');
        }
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        await this.navigate(hash);
    },

    setupRouter() {
        window.removeEventListener('hashchange', this._onHashChange);
        this._onHashChange = async () => {
            const page = window.location.hash.replace('#', '') || 'dashboard';
            await this.navigate(page);
        };
        window.addEventListener('hashchange', this._onHashChange);
    },

    async navigate(page) {
        if (!Auth.currentUser) {
            Auth.showLoginPage();
            return;
        }

        this.currentPage = page;
        Sidebar.setActive(page);

        const titleKeys = {
            dashboard: 'page_dashboard',
            bills: 'page_bills',
            payments: 'page_payments',
            debts: 'page_debts',
            calendar: 'page_calendar',
            users: 'page_users'
        };

        document.getElementById('page-title').textContent = t(titleKeys[page] || titleKeys.dashboard);

        switch (page) {
            case 'dashboard': await Dashboard.render(); break;
            case 'bills': await Bills.render(); break;
            case 'payments': await Payments.render(); break;
            case 'debts': await Debts.render(); break;
            case 'calendar': await CalendarView.render(); break;
            case 'users': await Auth.renderUserManagement(); break;
            default: await Dashboard.render();
        }
    },

    loadTheme() {
        const theme = localStorage.getItem('fincontrol-theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeUI(theme);
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('fincontrol-theme', next);
        this.updateThemeUI(next);
        if (this.currentPage === 'dashboard') Dashboard.render();
    },

    updateThemeUI(theme) {
        const icon = document.getElementById('theme-icon');
        const label = document.getElementById('theme-label');
        if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        if (label) label.textContent = theme === 'dark' ? t('nav_light_mode') : t('nav_dark_mode');
    },

    showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    async exportData() {
        try {
            const data = await storage.exportAll();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fincontrol-backup-${Auth.currentUser.username}-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            if (data.bills.length > 0) {
                const csv = this.toCSV(data.bills, ['name', 'category', 'creditor', 'amount', 'dueDate', 'type', 'status']);
                const csvBlob = new Blob([csv], { type: 'text/csv' });
                const csvUrl = URL.createObjectURL(csvBlob);
                const csvA = document.createElement('a');
                csvA.href = csvUrl;
                csvA.download = `fincontrol-bills-${Auth.currentUser.username}-${new Date().toISOString().split('T')[0]}.csv`;
                csvA.click();
                URL.revokeObjectURL(csvUrl);
            }
            this.showToast(t('export_success'), 'success');
        } catch (err) {
            this.showToast(t('export_error', { msg: err.message }), 'error');
        }
    },

    toCSV(data, columns) {
        const header = columns.join(',');
        const rows = data.map(item => {
            return columns.map(col => {
                const val = item[col] || '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            }).join(',');
        });
        return [header, ...rows].join('\n');
    }
};

/**
 * CalendarView — Payment Calendar (i18n)
 */
const CalendarView = {
    currentDate: new Date(),

    async render() {
        const content = document.getElementById('page-content');
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const monthLabel = this.currentDate.toLocaleDateString(i18n.getLocale(), { month: 'long', year: 'numeric' });

        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <button class="btn btn-outline btn-sm" onclick="CalendarView.prevMonth()">${t('calendar_previous')}</button>
                    <h3>${monthLabel}</h3>
                    <button class="btn btn-outline btn-sm" onclick="CalendarView.nextMonth()">${t('calendar_next')}</button>
                </div>
                <div class="card-body">
                    <div class="calendar-grid" id="calendar-grid"></div>
                </div>
            </div>
        `;
        await this.renderCalendar(year, month);
    },

    async renderCalendar(year, month) {
        const grid = document.getElementById('calendar-grid');
        const bills = await storage.getAll('bills');
        const payments = await storage.getAll('payments');

        const locale = i18n.getLocale();
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(2024, 0, i); // Sun=0..Sat=6, Jan 2024 starts on Monday
            days.push(d.toLocaleDateString(locale, { weekday: 'short' }));
        }
        let html = days.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const prevMonthDays = new Date(year, month, 0).getDate();

        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month"><div class="day-number">${prevMonthDays - i}</div></div>`;
        }

        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const dayBills = bills.filter(b => b.dueDate === dateStr);
            const dayPayments = payments.filter(p => p.paymentDate === dateStr);
            let events = '';
            dayBills.forEach(b => {
                const cls = b.status === 'paid' ? 'event-success' : (b.status === 'overdue' ? 'event-danger' : 'event-warning');
                events += `<div class="calendar-event ${cls}" title="${b.name}: R$ ${parseFloat(b.amount).toFixed(2)}">${b.name}</div>`;
            });
            dayPayments.forEach(p => {
                events += `<div class="calendar-event event-primary" title="R$ ${parseFloat(p.amount).toFixed(2)}">💰 R$ ${parseFloat(p.amount).toFixed(2)}</div>`;
            });
            html += `<div class="calendar-day ${isToday ? 'today' : ''}"><div class="day-number">${day}</div>${events}</div>`;
        }

        const totalCells = firstDay + totalDays;
        const remaining = 7 - (totalCells % 7);
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                html += `<div class="calendar-day other-month"><div class="day-number">${i}</div></div>`;
            }
        }
        grid.innerHTML = html;
    },

    prevMonth() { this.currentDate.setMonth(this.currentDate.getMonth() - 1); this.render(); },
    nextMonth() { this.currentDate.setMonth(this.currentDate.getMonth() + 1); this.render(); }
};

document.addEventListener('DOMContentLoaded', () => { App.init(); });
