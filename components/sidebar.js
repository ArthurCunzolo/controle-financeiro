/**
 * sidebar.js — Sidebar Navigation Component (i18n)
 */

const Sidebar = {
    render() {
        const sidebar = document.getElementById('sidebar');
        const user = Auth.currentUser;
        const isAdmin = Auth.isAdmin();
        const initials = user ? user.username.charAt(0).toUpperCase() : '?';
        const theme = document.documentElement.getAttribute('data-theme') || 'light';

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <div class="logo-icon">💰</div>
                    <div>
                        <h1>${t('app_name')}</h1>
                        <div class="subtitle">${t('app_subtitle')}</div>
                    </div>
                </div>
            </div>

            <div class="sidebar-user">
                <div class="user-info">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-details">
                        <div class="user-name">${user ? user.username : 'Guest'}</div>
                        <div class="user-role">${user && user.role === 'admin' ? t('role_admin') : t('role_user')}</div>
                    </div>
                    <button class="logout-btn" title="Logout" onclick="Auth.logout()">🚪</button>
                </div>
            </div>

            <nav class="sidebar-nav">
                <div class="nav-section-title">${t('nav_main')}</div>
                <a class="nav-item active" data-page="dashboard" href="#dashboard">
                    <span class="nav-icon">📊</span>
                    <span>${t('nav_dashboard')}</span>
                </a>
                <a class="nav-item" data-page="bills" href="#bills">
                    <span class="nav-icon">📋</span>
                    <span>${t('nav_bills')}</span>
                    <span class="nav-badge hidden" id="overdue-badge">0</span>
                </a>
                <a class="nav-item" data-page="payments" href="#payments">
                    <span class="nav-icon">💳</span>
                    <span>${t('nav_payments')}</span>
                </a>
                <a class="nav-item" data-page="incomes" href="#incomes">
                    <span class="nav-icon">💵</span>
                    <span>${t('nav_incomes')}</span>
                </a>
                <a class="nav-item" data-page="debts" href="#debts">
                    <span class="nav-icon">🔄</span>
                    <span>${t('nav_renegotiations')}</span>
                </a>
                <div class="nav-section-title">${t('nav_tools')}</div>
                <a class="nav-item" data-page="calendar" href="#calendar">
                    <span class="nav-icon">📅</span>
                    <span>${t('nav_calendar')}</span>
                </a>
                <a class="nav-item" id="nav-export" href="javascript:void(0)">
                    <span class="nav-icon">📤</span>
                    <span>${t('nav_export')}</span>
                </a>
                <a class="nav-item" id="nav-import" href="javascript:void(0)">
                    <span class="nav-icon">📥</span>
                    <span>${t('nav_import')}</span>
                </a>
                ${isAdmin ? `
                <div class="nav-section-title">${t('nav_admin')}</div>
                <a class="nav-item" data-page="users" href="#users">
                    <span class="nav-icon">👥</span>
                    <span>${t('nav_users')}</span>
                </a>
                ` : ''}
            </nav>
            <div class="sidebar-footer">
                <div class="sidebar-lang-select">
                    <select id="sidebar-lang" onchange="App.changeLanguage(this.value)">
                        <option value="en" ${i18n.getLang() === 'en' ? 'selected' : ''}>🇺🇸 English</option>
                        <option value="pt" ${i18n.getLang() === 'pt' ? 'selected' : ''}>🇧🇷 Português</option>
                    </select>
                </div>
                <button class="theme-toggle" id="theme-toggle">
                    <span class="nav-icon" id="theme-icon">${theme === 'dark' ? '☀️' : '🌙'}</span>
                    <span id="theme-label">${theme === 'dark' ? t('nav_light_mode') : t('nav_dark_mode')}</span>
                </button>
            </div>
        `;

        this.bindEvents();
    },

    bindEvents() {
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.setActive(page);
                window.location.hash = page;
                document.getElementById('sidebar').classList.remove('open');
            });
        });

        document.getElementById('theme-toggle').addEventListener('click', () => {
            App.toggleTheme();
        });

        document.getElementById('nav-export').addEventListener('click', () => {
            App.exportData();
        });

        document.getElementById('nav-import').addEventListener('click', () => {
            App.showImportModal();
        });

        const toggle = document.getElementById('sidebar-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('open');
            });
        }
    },

    setActive(page) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (activeItem) activeItem.classList.add('active');
    },

    updateBadge(count) {
        const badge = document.getElementById('overdue-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }
};
