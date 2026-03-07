/**
 * auth.js — Authentication & User Management Module (i18n)
 * 
 * Default admin: Arthur / Zaq12wsx@!
 */

const Auth = {
    currentUser: null,

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async init() {
        await this.ensureAdminExists();
        return this.checkSession();
    },

    async ensureAdminExists() {
        const users = await storage.getAllRaw('users');
        const admin = users.find(u => u.username === 'Arthur');
        if (!admin) {
            const hashedPassword = await this.hashPassword('Zaq12wsx@!');
            await storage.addRaw('users', {
                id: 'admin_arthur',
                username: 'Arthur',
                password: hashedPassword,
                role: 'admin',
                createdAt: new Date().toISOString()
            });
        }
    },

    checkSession() {
        const session = localStorage.getItem('fincontrol-session');
        if (session) {
            try {
                const user = JSON.parse(session);
                this.currentUser = user;
                return user;
            } catch {
                localStorage.removeItem('fincontrol-session');
            }
        }
        return null;
    },

    async login(username, password) {
        const users = await storage.getAllRaw('users');
        const user = users.find(u => u.username === username);
        if (!user) throw new Error(t('login_error_not_found'));

        const hashedPassword = await this.hashPassword(password);
        if (user.password !== hashedPassword) throw new Error(t('login_error_wrong_password'));

        const session = { id: user.id, username: user.username, role: user.role };
        this.currentUser = session;
        localStorage.setItem('fincontrol-session', JSON.stringify(session));
        return session;
    },

    logout() {
        this.currentUser = null;
        localStorage.removeItem('fincontrol-session');
        this.showLoginPage();
    },

    async registerUser(username, password, role = 'user') {
        if (!this.isAdmin()) throw new Error('Only administrators can create users');
        const users = await storage.getAllRaw('users');
        if (users.find(u => u.username === username)) throw new Error('Username already exists');

        const hashedPassword = await this.hashPassword(password);
        await storage.addRaw('users', {
            username, password: hashedPassword, role,
            createdAt: new Date().toISOString()
        });
    },

    async deleteUser(userId) {
        if (!this.isAdmin()) throw new Error('Admin only');
        if (userId === 'admin_arthur') throw new Error(t('users_cannot_delete_admin'));
        await storage.deleteRaw('users', userId);
    },

    async getAllUsers() {
        if (!this.isAdmin()) throw new Error('Admin only');
        const users = await storage.getAllRaw('users');
        return users.map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt }));
    },

    async changePassword(userId, newPassword) {
        const user = await storage.getByIdRaw('users', userId);
        if (!user) throw new Error('User not found');
        if (userId !== this.currentUser.id && !this.isAdmin()) throw new Error('Permission denied');
        user.password = await this.hashPassword(newPassword);
        await storage.updateRaw('users', user);
    },

    isAdmin() { return this.currentUser && this.currentUser.role === 'admin'; },
    getUserId() { return this.currentUser ? this.currentUser.id : null; },

    showLoginPage() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('login-error').textContent = '';
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-username').focus();
        App.updateLoginLabels();
    },

    showApp() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-container').classList.remove('hidden');
    },

    async handleLogin(event) {
        event.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const submitBtn = document.getElementById('login-submit');

        if (!username || !password) {
            errorEl.textContent = t('login_error_empty');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = t('login_signing_in');

        try {
            await Auth.login(username, password);
            Auth.showApp();
            await App.onLogin();
        } catch (err) {
            errorEl.textContent = err.message;
            submitBtn.disabled = false;
            submitBtn.textContent = t('login_submit');
        }
    },

    async renderUserManagement() {
        const content = document.getElementById('page-content');

        if (!this.isAdmin()) {
            content.innerHTML = `<div class="card"><div class="card-body text-center text-muted"><p>${t('users_no_permission')}</p></div></div>`;
            return;
        }

        const users = await this.getAllUsers();
        const locale = i18n.getLocale();

        content.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h3>${t('users_title')}</h3>
                    <button class="btn btn-primary" onclick="Auth.openUserForm()">
                        ${t('users_new')}
                    </button>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>${t('users_col_username')}</th>
                                <th>${t('users_col_role')}</th>
                                <th>${t('users_col_created')}</th>
                                <th>${t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr>
                                    <td><strong>${u.username}</strong></td>
                                    <td>
                                        <span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-neutral'}">
                                            ${u.role === 'admin' ? t('users_role_admin') : t('users_role_user')}
                                        </span>
                                    </td>
                                    <td class="text-muted">${u.createdAt ? new Date(u.createdAt).toLocaleDateString(locale) : '—'}</td>
                                    <td>
                                        <div class="action-btns">
                                            <button class="btn btn-ghost btn-icon" title="${t('users_change_password')}" onclick="Auth.openChangePassword('${u.id}', '${u.username}')">🔑</button>
                                            ${u.id !== 'admin_arthur' ? `<button class="btn btn-ghost btn-icon" title="${t('delete')}" onclick="Auth.confirmDeleteUser('${u.id}', '${u.username}')">🗑️</button>` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- New User Modal -->
            <div class="modal-overlay" id="user-modal">
                <div class="modal-content" style="max-width: 420px;">
                    <div class="modal-header">
                        <h3>${t('users_new_title')}</h3>
                        <button class="modal-close" onclick="Modal.close('user-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="user-form" onsubmit="Auth.saveUser(event)">
                            <div class="form-group">
                                <label>${t('users_username')} <span class="required">${t('required')}</span></label>
                                <input type="text" id="new-username" required placeholder="${t('users_username')}">
                            </div>
                            <div class="form-group">
                                <label>${t('users_password')} <span class="required">${t('required')}</span></label>
                                <input type="password" id="new-password" required placeholder="${t('users_password')}" minlength="4">
                            </div>
                            <div class="form-group">
                                <label>${t('users_role')}</label>
                                <select id="new-role">
                                    <option value="user">${t('users_role_user')}</option>
                                    <option value="admin">${t('users_role_admin')}</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="Modal.close('user-modal')">${t('cancel')}</button>
                        <button class="btn btn-primary" onclick="document.getElementById('user-form').requestSubmit()">${t('users_create')}</button>
                    </div>
                </div>
            </div>

            <!-- Change Password Modal -->
            <div class="modal-overlay" id="password-modal">
                <div class="modal-content" style="max-width: 420px;">
                    <div class="modal-header">
                        <h3>${t('users_change_password')}</h3>
                        <button class="modal-close" onclick="Modal.close('password-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="password-form" onsubmit="Auth.savePassword(event)">
                            <input type="hidden" id="change-password-user-id">
                            <div class="form-group">
                                <label>${t('users_user_label')}: <strong id="change-password-username"></strong></label>
                            </div>
                            <div class="form-group">
                                <label>${t('users_new_password')} <span class="required">${t('required')}</span></label>
                                <input type="password" id="change-password-value" required placeholder="${t('users_new_password')}" minlength="4">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="Modal.close('password-modal')">${t('cancel')}</button>
                        <button class="btn btn-primary" onclick="document.getElementById('password-form').requestSubmit()">${t('users_update_password')}</button>
                    </div>
                </div>
            </div>
        `;
    },

    openUserForm() {
        document.getElementById('new-username').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('new-role').value = 'user';
        Modal.open('user-modal');
    },

    async saveUser(event) {
        event.preventDefault();
        const username = document.getElementById('new-username').value.trim();
        const password = document.getElementById('new-password').value;
        const role = document.getElementById('new-role').value;

        try {
            await this.registerUser(username, password, role);
            App.showToast(t('users_created_msg', { name: username }), 'success');
            Modal.close('user-modal');
            await this.renderUserManagement();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    },

    openChangePassword(userId, username) {
        document.getElementById('change-password-user-id').value = userId;
        document.getElementById('change-password-username').textContent = username;
        document.getElementById('change-password-value').value = '';
        Modal.open('password-modal');
    },

    async savePassword(event) {
        event.preventDefault();
        const userId = document.getElementById('change-password-user-id').value;
        const newPassword = document.getElementById('change-password-value').value;

        try {
            await this.changePassword(userId, newPassword);
            App.showToast(t('users_password_updated'), 'success');
            Modal.close('password-modal');
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    },

    async confirmDeleteUser(userId, username) {
        const confirmed = await Modal.confirm(t('users_delete_title'), t('users_delete_msg', { name: username }));
        if (confirmed) {
            try {
                await this.deleteUser(userId);
                App.showToast(t('users_deleted_msg', { name: username }), 'success');
                await this.renderUserManagement();
            } catch (err) {
                App.showToast(err.message, 'error');
            }
        }
    }
};
