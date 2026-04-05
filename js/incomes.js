/**
 * incomes.js — Incomes Registration Module (i18n)
 */

const Incomes = {
    async render() {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h3>${t('incomes_title')}</h3>
                    <div class="table-filters">
                        <div class="search-input">
                            <span class="search-icon">🔍</span>
                            <input type="text" id="incomes-search" placeholder="${t('incomes_search')}" style="width: 200px;">
                        </div>
                        <select class="filter-select" id="incomes-filter-type">
                            <option value="">${t('incomes_all_types')}</option>
                            <option value="salary">${t('income_type_salary')}</option>
                            <option value="vr">${t('income_type_vr')}</option>
                            <option value="va">${t('income_type_va')}</option>
                            <option value="freelance">${t('income_type_freelance')}</option>
                            <option value="other">${t('income_type_other')}</option>
                        </select>
                        <select class="filter-select" id="incomes-filter-month">
                            <option value="">${t('incomes_all_months')}</option>
                        </select>
                        <button class="btn btn-primary" onclick="Incomes.openForm()">
                            ${t('incomes_new')}
                        </button>
                    </div>
                </div>
                <div class="table-responsive" id="incomes-table-wrapper"></div>
            </div>

            <!-- Income Form Modal -->
            <div class="modal-overlay" id="income-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="income-modal-title">${t('incomes_modal_new')}</h3>
                        <button class="modal-close" onclick="Modal.close('income-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="income-form" onsubmit="Incomes.save(event)">
                            <input type="hidden" id="income-id">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>${t('income_amount')} <span class="required">*</span></label>
                                    <input type="number" id="income-amount" step="0.01" min="0" required placeholder="0.00">
                                </div>
                                <div class="form-group">
                                    <label>${t('income_date')} <span class="required">*</span></label>
                                    <input type="date" id="income-date" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>${t('income_type')} <span class="required">*</span></label>
                                <select id="income-type" required>
                                    <option value="">${t('select')}</option>
                                    <option value="salary">${t('income_type_salary')}</option>
                                    <option value="vr">${t('income_type_vr')}</option>
                                    <option value="va">${t('income_type_va')}</option>
                                    <option value="freelance">${t('income_type_freelance')}</option>
                                    <option value="other">${t('income_type_other')}</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>${t('income_desc')}</label>
                                <input type="text" id="income-desc" placeholder="${t('income_desc_placeholder')}">
                            </div>
                            <div class="form-group">
                                <label>${t('income_freq')} <span class="required">*</span></label>
                                <select id="income-freq" required>
                                    <option value="one_time">${t('income_freq_one_time')}</option>
                                    <option value="monthly">${t('income_freq_monthly')}</option>
                                    <option value="weekly">${t('income_freq_weekly')}</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>${t('notes')}</label>
                                <textarea id="income-notes" placeholder="${t('income_desc_placeholder')}"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="Modal.close('income-modal')">${t('cancel')}</button>
                        <button class="btn btn-primary" onclick="document.getElementById('income-form').requestSubmit()">${t('incomes_save')}</button>
                    </div>
                </div>
            </div>
        `;
        this.populateMonthFilter();
        await this.loadTable();
        this.bindFilters();
    },

    populateMonthFilter() {
        const select = document.getElementById('incomes-filter-month');
        const now = new Date();
        const locale = i18n.getLocale();
        for (let i = -6; i <= 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = label;
            select.appendChild(opt);
        }
    },

    bindFilters() {
        ['incomes-search', 'incomes-filter-type', 'incomes-filter-month'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.loadTable());
                el.addEventListener('change', () => this.loadTable());
            }
        });
    },

    async loadTable() {
        const incomes = await storage.getAll('incomes');
        let filtered = this.applyFilters(incomes);
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const wrapper = document.getElementById('incomes-table-wrapper');

        if (filtered.length === 0) {
            wrapper.innerHTML = `<div class="table-empty"><div class="empty-icon">💵</div><p>${t('incomes_no_incomes')}</p></div>`;
            return;
        }

        wrapper.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>${t('income_col_date')}</th>
                        <th>${t('income_col_type')}</th>
                        <th>${t('income_col_amount')}</th>
                        <th>${t('income_col_desc')}</th>
                        <th>${t('income_col_freq')}</th>
                        <th>${t('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(inc => `
                        <tr>
                            <td>${this.formatDate(inc.date)}</td>
                            <td>${this.getTypeBadge(inc.type)}</td>
                            <td><strong class="text-success">R$ ${parseFloat(inc.amount).toFixed(2)}</strong></td>
                            <td><strong>${inc.description || '—'}</strong></td>
                            <td>${this.getFreqBadge(inc.frequency)}</td>
                            <td>
                                <div class="action-btns">
                                    <button class="btn btn-ghost btn-icon" title="${t('edit')}" onclick="Incomes.edit('${inc.id}')">✏️</button>
                                    <button class="btn btn-ghost btn-icon" title="${t('delete')}" onclick="Incomes.deleteIncome('${inc.id}')">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    applyFilters(incomes) {
        const search = document.getElementById('incomes-search')?.value?.toLowerCase() || '';
        const type = document.getElementById('incomes-filter-type')?.value || '';
        const month = document.getElementById('incomes-filter-month')?.value || '';

        return incomes.filter(inc => {
            if (search && !(inc.description && inc.description.toLowerCase().includes(search))) return false;
            if (type && inc.type !== type) return false;
            if (month) {
                const incMonth = inc.date.substring(0, 7);
                if (incMonth !== month) return false;
            }
            return true;
        });
    },

    openForm(inc = null) {
        document.getElementById('income-modal-title').textContent = inc ? t('incomes_modal_edit') : t('incomes_modal_new');
        document.getElementById('income-id').value = inc ? inc.id : '';
        document.getElementById('income-amount').value = inc ? inc.amount : '';
        document.getElementById('income-date').value = inc ? inc.date : new Date().toISOString().split('T')[0];
        document.getElementById('income-type').value = inc ? inc.type : '';
        document.getElementById('income-desc').value = inc ? (inc.description || '') : '';
        document.getElementById('income-freq').value = inc ? inc.frequency : 'one_time';
        document.getElementById('income-notes').value = inc ? (inc.notes || '') : '';
        Modal.open('income-modal');
    },

    async save(event) {
        event.preventDefault();
        const id = document.getElementById('income-id').value;
        const inc = {
            amount: parseFloat(document.getElementById('income-amount').value),
            date: document.getElementById('income-date').value,
            type: document.getElementById('income-type').value,
            description: document.getElementById('income-desc').value,
            frequency: document.getElementById('income-freq').value,
            recurrent: document.getElementById('income-freq').value !== 'one_time',
            notes: document.getElementById('income-notes').value,
        };

        try {
            if (id) {
                inc.id = id;
                const existing = await storage.getById('incomes', id);
                inc.createdAt = existing.createdAt;
                await storage.update('incomes', inc);
                App.showToast(t('income_updated'), 'success');
            } else {
                await storage.add('incomes', inc);
                App.showToast(t('income_created'), 'success');
            }
            Modal.close('income-modal');
            await this.loadTable();
        } catch (err) {
            App.showToast('Error: ' + err.message, 'error');
        }
    },

    async edit(id) {
        const inc = await storage.getById('incomes', id);
        if (inc) this.openForm(inc);
    },

    async deleteIncome(id) {
        const confirmed = await Modal.confirm(t('income_delete_confirm_title'), t('income_delete_confirm_msg'));
        if (confirmed) {
            await storage.delete('incomes', id);
            App.showToast(t('income_deleted'), 'success');
            await this.loadTable();
        }
    },

    formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString(i18n.getLocale(), { month: 'short', day: 'numeric', year: 'numeric' });
    },

    getTypeBadge(type) {
        const colors = {
            salary: 'primary',
            vr: 'info',
            va: 'info',
            freelance: 'success',
            other: 'neutral'
        };
        const color = colors[type] || 'neutral';
        return `<span class="badge badge-${color}">${t('income_type_' + type)}</span>`;
    },

    getFreqBadge(freq) {
        if (freq === 'monthly') return `<span class="badge badge-primary">${t('income_freq_monthly')}</span>`;
        if (freq === 'weekly') return `<span class="badge badge-warning">${t('income_freq_weekly')}</span>`;
        return `<span class="badge badge-neutral">${t('income_freq_one_time')}</span>`;
    }
};
