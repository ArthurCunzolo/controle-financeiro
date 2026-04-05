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
            incomes: 'page_incomes',
            calendar: 'page_calendar',
            users: 'page_users'
        };

        document.getElementById('page-title').textContent = t(titleKeys[page] || titleKeys.dashboard);

        switch (page) {
            case 'dashboard': await Dashboard.render(); break;
            case 'bills': await Bills.render(); break;
            case 'payments': await Payments.render(); break;
            case 'debts': await Debts.render(); break;
            case 'incomes': await Incomes.render(); break;
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
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
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
    },

    // ===================== IMPORT DATA =====================

    /** Pending import data (set when file is parsed) */
    _importData: null,

    /** Show the import modal with drag-and-drop & preview */
    showImportModal() {
        // Remove any existing import modal
        const existing = document.getElementById('import-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.id = 'import-modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content import-modal">
                <div class="modal-header">
                    <h3>${t('import_modal_title')}</h3>
                    <button class="modal-close-btn" id="import-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">${t('import_select_file_desc')}</p>

                    <!-- Drop Zone -->
                    <div class="import-drop-zone" id="import-drop-zone">
                        <div class="import-drop-icon">📂</div>
                        <p class="import-drop-text">${t('import_drop_zone')}</p>
                        <input type="file" accept=".json" id="import-file-input" style="display:none;">
                    </div>

                    <!-- File Info (hidden until file is loaded) -->
                    <div class="import-file-info hidden" id="import-file-info">
                        <div class="import-file-badge">
                            <span class="import-file-icon">📄</span>
                            <span class="import-file-name" id="import-file-name"></span>
                            <button class="import-file-remove" id="import-file-remove" title="Remove">✕</button>
                        </div>
                    </div>

                    <!-- Preview (hidden until file is parsed) -->
                    <div class="import-preview hidden" id="import-preview">
                        <h4>${t('import_preview_title')}</h4>
                        <div class="import-preview-grid" id="import-preview-grid"></div>
                        <div class="import-exported-at" id="import-exported-at"></div>
                    </div>

                    <!-- Import Mode -->
                    <div class="import-mode-section hidden" id="import-mode-section">
                        <h4>${t('import_mode')}</h4>
                        <label class="import-radio-label">
                            <input type="radio" name="import-mode" value="merge" checked>
                            <span class="import-radio-text">${t('import_mode_merge')}</span>
                        </label>
                        <label class="import-radio-label">
                            <input type="radio" name="import-mode" value="replace">
                            <span class="import-radio-text">${t('import_mode_replace')}</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="import-cancel">${t('cancel')}</button>
                    <button class="btn btn-primary" id="import-confirm" disabled>${t('import_btn')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Reset state
        this._importData = null;

        // Bind events
        const closeModal = () => { overlay.remove(); this._importData = null; };
        overlay.querySelector('#import-close').addEventListener('click', closeModal);
        overlay.querySelector('#import-cancel').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
        });

        const dropZone = overlay.querySelector('#import-drop-zone');
        const fileInput = overlay.querySelector('#import-file-input');

        // Click to browse
        dropZone.addEventListener('click', () => fileInput.click());

        // File selected via input
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) this._handleImportFile(e.target.files[0]);
        });

        // Drag & Drop
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) this._handleImportFile(e.dataTransfer.files[0]);
        });

        // Remove file
        overlay.querySelector('#import-file-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            this._importData = null;
            fileInput.value = '';
            document.getElementById('import-file-info').classList.add('hidden');
            document.getElementById('import-preview').classList.add('hidden');
            document.getElementById('import-mode-section').classList.add('hidden');
            document.getElementById('import-drop-zone').classList.remove('hidden');
            document.getElementById('import-confirm').disabled = true;
        });

        // Confirm import
        overlay.querySelector('#import-confirm').addEventListener('click', () => this._executeImport());
    },

    /** Parse and preview the selected import file */
    _handleImportFile(file) {
        if (!file.name.toLowerCase().endsWith('.json')) {
            this.showToast(t('import_error_invalid'), 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validate structure
                if (!data.bills && !data.payments && !data.renegotiations && !data.incomes) {
                    this.showToast(t('import_error_invalid'), 'error');
                    return;
                }

                const billsCount = (data.bills || []).length;
                const paymentsCount = (data.payments || []).length;
                const renosCount = (data.renegotiations || []).length;
                const incomesCount = (data.incomes || []).length;
                const total = billsCount + paymentsCount + renosCount + incomesCount;

                if (total === 0) {
                    this.showToast(t('import_error_empty'), 'warning');
                    return;
                }

                this._importData = data;

                // Update UI — show file info
                document.getElementById('import-drop-zone').classList.add('hidden');
                document.getElementById('import-file-info').classList.remove('hidden');
                document.getElementById('import-file-name').textContent = file.name;

                // Show preview
                const previewGrid = document.getElementById('import-preview-grid');
                previewGrid.innerHTML = `
                    ${billsCount > 0 ? `<div class="import-preview-card"><span class="import-preview-icon">📋</span><span class="import-preview-count">${t('import_bills_count', { n: billsCount })}</span></div>` : ''}
                    ${paymentsCount > 0 ? `<div class="import-preview-card"><span class="import-preview-icon">💳</span><span class="import-preview-count">${t('import_payments_count', { n: paymentsCount })}</span></div>` : ''}
                    ${renosCount > 0 ? `<div class="import-preview-card"><span class="import-preview-icon">🔄</span><span class="import-preview-count">${t('import_renegotiations_count', { n: renosCount })}</span></div>` : ''}
                    ${incomesCount > 0 ? `<div class="import-preview-card"><span class="import-preview-icon">💵</span><span class="import-preview-count">${t('import_incomes_count', { n: incomesCount })}</span></div>` : ''}
                `;

                const exportedAtEl = document.getElementById('import-exported-at');
                if (data.exportedAt) {
                    const date = new Date(data.exportedAt);
                    exportedAtEl.textContent = `${t('import_exported_at')}: ${date.toLocaleDateString(i18n.getLocale())} ${date.toLocaleTimeString(i18n.getLocale())}`;
                } else {
                    exportedAtEl.textContent = '';
                }

                document.getElementById('import-preview').classList.remove('hidden');
                document.getElementById('import-mode-section').classList.remove('hidden');
                document.getElementById('import-confirm').disabled = false;

            } catch (err) {
                this.showToast(t('import_error_invalid'), 'error');
            }
        };
        reader.readAsText(file);
    },

    /** Execute the import after confirmation */
    async _executeImport() {
        if (!this._importData) {
            this.showToast(t('import_error_no_file'), 'error');
            return;
        }

        const mode = document.querySelector('input[name="import-mode"]:checked').value;

        // If replace mode, ask for confirmation
        if (mode === 'replace') {
            const confirmed = await Modal.confirm(
                t('import_confirm_replace_title'),
                t('import_confirm_replace_msg')
            );
            if (!confirmed) return;
        }

        // Disable the button and show loading state
        const btn = document.getElementById('import-confirm');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = t('import_processing');

        try {
            if (mode === 'replace') {
                await storage.clearUserData();
            }

            const count = await storage.importData(this._importData);

            // Close modal
            const overlay = document.getElementById('import-modal-overlay');
            if (overlay) overlay.remove();
            this._importData = null;

            this.showToast(t('import_success', { n: count }), 'success');

            // Refresh current page
            await this.navigate(this.currentPage);

        } catch (err) {
            btn.disabled = false;
            btn.textContent = originalText;
            this.showToast(t('import_error', { msg: err.message }), 'error');
        }
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
