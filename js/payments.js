/**
 * payments.js — Payment Registration Module (i18n)
 */

const Payments = {
    async render() {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h3>${t('payments_title')}</h3>
                    <div class="table-filters">
                        <div class="search-input">
                            <span class="search-icon">🔍</span>
                            <input type="text" id="payments-search" placeholder="${t('payments_search')}" style="width: 200px;">
                        </div>
                        <select class="filter-select" id="payments-filter-method">
                            <option value="">${t('payments_all_methods')}</option>
                            <option value="pix">${t('method_pix')}</option>
                            <option value="credit_card">${t('method_credit_card')}</option>
                            <option value="debit_card">${t('method_debit_card')}</option>
                            <option value="bank_transfer">${t('method_bank_transfer')}</option>
                            <option value="cash">${t('method_cash')}</option>
                            <option value="boleto">${t('method_boleto')}</option>
                            <option value="vr">${t('method_vr')}</option>
                            <option value="va">${t('method_va')}</option>
                        </select>
                        <select class="filter-select" id="payments-filter-month">
                            <option value="">${t('payments_all_months')}</option>
                        </select>
                        <button class="btn btn-primary" onclick="Payments.openForm()">
                            ${t('payments_new')}
                        </button>
                    </div>
                </div>
                <div class="table-responsive" id="payments-table-wrapper"></div>
            </div>

            <!-- Payment Form Modal -->
            <div class="modal-overlay" id="payment-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="payment-modal-title">${t('payments_modal_new')}</h3>
                        <button class="modal-close" onclick="Modal.close('payment-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="payment-form" onsubmit="Payments.save(event)">
                            <input type="hidden" id="payment-id">
                            <div class="form-group">
                                <label>${t('payment_related_bill')} <span class="required">${t('required')}</span></label>
                                <select id="payment-bill" required onchange="Payments.onBillSelect()">
                                    <option value="">${t('payment_select_bill')}</option>
                                </select>
                            </div>
                            <div id="payment-bill-info" class="hidden" style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-sm); font-size: 13px;"></div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>${t('payment_amount_paid')} <span class="required">${t('required')}</span></label>
                                    <input type="number" id="payment-amount" step="0.01" min="0.01" required placeholder="0.00" oninput="Payments.calcDifference()">
                                </div>
                                <div class="form-group">
                                    <label>${t('payment_date')} <span class="required">${t('required')}</span></label>
                                    <input type="date" id="payment-date" required>
                                </div>
                            </div>
                            <div id="payment-diff" class="hidden" style="margin-bottom: 16px; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500;"></div>
                            <div class="form-group">
                                <label>${t('payment_method')} <span class="required">${t('required')}</span></label>
                                <select id="payment-method" required>
                                    <option value="">${t('payment_select_method')}</option>
                                    <option value="pix">💲 ${t('method_pix')}</option>
                                    <option value="credit_card">💳 ${t('method_credit_card')}</option>
                                    <option value="debit_card">💳 ${t('method_debit_card')}</option>
                                    <option value="bank_transfer">🏦 ${t('method_bank_transfer')}</option>
                                    <option value="cash">💵 ${t('method_cash')}</option>
                                    <option value="boleto">📄 ${t('method_boleto')}</option>
                                    <option value="vr">🍽️ ${t('method_vr')}</option>
                                    <option value="va">🛒 ${t('method_va')}</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>${t('notes')}</label>
                                <textarea id="payment-notes" placeholder="${t('payment_notes_placeholder')}"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="Modal.close('payment-modal')">${t('cancel')}</button>
                        <button class="btn btn-success" onclick="document.getElementById('payment-form').requestSubmit()">${t('payments_save')}</button>
                    </div>
                </div>
            </div>
        `;

        this.populateMonthFilter();
        await this.loadTable();
        this.bindFilters();
    },

    populateMonthFilter() {
        const select = document.getElementById('payments-filter-month');
        const now = new Date();
        const locale = i18n.getLocale();
        for (let i = -6; i <= 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const label = d.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = label;
            select.appendChild(opt);
        }
    },

    bindFilters() {
        ['payments-search', 'payments-filter-method', 'payments-filter-month'].forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener('input', () => this.loadTable());
            el.addEventListener('change', () => this.loadTable());
        });
    },

    async loadTable() {
        const payments = await storage.getAll('payments');
        const bills = await storage.getAll('bills');
        const billMap = {};
        bills.forEach(b => billMap[b.id] = b);
        let filtered = this.applyFilters(payments, billMap);
        filtered.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
        const wrapper = document.getElementById('payments-table-wrapper');

        if (filtered.length === 0) {
            wrapper.innerHTML = `<div class="table-empty"><div class="empty-icon">💳</div><p>${t('payments_no_payments')}</p></div>`;
            return;
        }

        wrapper.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>${t('payment_col_bill')}</th>
                        <th>${t('payment_col_amount_paid')}</th>
                        <th>${t('payment_col_expected')}</th>
                        <th>${t('payment_col_difference')}</th>
                        <th>${t('payment_col_date')}</th>
                        <th>${t('payment_col_method')}</th>
                        <th>${t('payment_col_notes')}</th>
                        <th>${t('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(p => {
                        const bill = billMap[p.billId];
                        const expected = bill ? bill.amount : 0;
                        const diff = parseFloat(p.amount) - expected;
                        return `
                            <tr>
                                <td><strong>${bill ? bill.name : t('unknown')}</strong></td>
                                <td><strong class="text-success">R$ ${parseFloat(p.amount).toFixed(2)}</strong></td>
                                <td>R$ ${parseFloat(expected).toFixed(2)}</td>
                                <td><span class="${diff >= 0 ? 'text-success' : 'text-danger'}">${diff >= 0 ? '+' : ''}R$ ${diff.toFixed(2)}</span></td>
                                <td>${this.formatDate(p.paymentDate)}</td>
                                <td>${this.getMethodBadge(p.method)}</td>
                                <td class="text-muted">${p.notes || '—'}</td>
                                <td>
                                    <div class="action-btns">
                                        <button class="btn btn-ghost btn-icon" title="${t('edit')}" onclick="Payments.edit('${p.id}')">✏️</button>
                                        <button class="btn btn-ghost btn-icon" title="${t('delete')}" onclick="Payments.deletePayment('${p.id}')">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    applyFilters(payments, billMap) {
        const search = document.getElementById('payments-search')?.value?.toLowerCase() || '';
        const method = document.getElementById('payments-filter-method')?.value || '';
        const month = document.getElementById('payments-filter-month')?.value || '';

        return payments.filter(p => {
            const bill = billMap[p.billId];
            if (search) {
                const billName = bill ? bill.name.toLowerCase() : '';
                if (!billName.includes(search) && !(p.notes && p.notes.toLowerCase().includes(search))) return false;
            }
            if (method && p.method !== method) return false;
            if (month) {
                const pMonth = p.paymentDate.substring(0, 7);
                if (pMonth !== month) return false;
            }
            return true;
        });
    },

    async openForm(payment = null, preFillBillId = null) {
        document.getElementById('payment-modal-title').textContent = payment ? t('payments_modal_edit') : t('payments_modal_new');
        document.getElementById('payment-id').value = payment ? payment.id : '';
        document.getElementById('payment-amount').value = payment ? payment.amount : '';
        document.getElementById('payment-date').value = payment ? payment.paymentDate : new Date().toISOString().split('T')[0];
        document.getElementById('payment-method').value = payment ? payment.method : '';
        document.getElementById('payment-notes').value = payment ? (payment.notes || '') : '';

        const bills = await storage.getAll('bills');
        const select = document.getElementById('payment-bill');
        select.innerHTML = `<option value="">${t('payment_select_bill')}</option>`;
        bills.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = `${b.name} — R$ ${parseFloat(b.amount).toFixed(2)}`;
            select.appendChild(opt);
        });

        if (payment) select.value = payment.billId;
        else if (preFillBillId) select.value = preFillBillId;

        this.onBillSelect();
        Modal.open('payment-modal');
    },

    async onBillSelect() {
        const billId = document.getElementById('payment-bill').value;
        const infoDiv = document.getElementById('payment-bill-info');
        if (!billId) { infoDiv.classList.add('hidden'); return; }

        const bill = await storage.getById('bills', billId);
        const payments = await storage.getByIndex('payments', 'billId', billId);
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const remaining = Math.max(0, bill.amount - totalPaid);

        infoDiv.classList.remove('hidden');
        infoDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <span>📋 <strong>${bill.name}</strong></span>
                <span>${t('payment_info_expected')}: <strong>R$ ${parseFloat(bill.amount).toFixed(2)}</strong></span>
                <span>${t('payment_info_already_paid')}: <strong class="text-success">R$ ${totalPaid.toFixed(2)}</strong></span>
                <span>${t('payment_info_remaining')}: <strong class="${remaining > 0 ? 'text-danger' : 'text-success'}">R$ ${remaining.toFixed(2)}</strong></span>
            </div>
        `;

        if (!document.getElementById('payment-id').value) {
            document.getElementById('payment-amount').value = remaining > 0 ? remaining.toFixed(2) : bill.amount;
        }
        this.calcDifference();
    },

    async calcDifference() {
        const billId = document.getElementById('payment-bill').value;
        const amount = parseFloat(document.getElementById('payment-amount').value) || 0;
        const diffDiv = document.getElementById('payment-diff');
        if (!billId || !amount) { diffDiv.classList.add('hidden'); return; }

        const bill = await storage.getById('bills', billId);
        const diff = amount - bill.amount;
        diffDiv.classList.remove('hidden');

        if (diff > 0) {
            diffDiv.style.background = 'var(--success-50)';
            diffDiv.style.color = 'var(--success-700)';
            diffDiv.textContent = t('payment_diff_more', { amount: diff.toFixed(2) });
        } else if (diff < 0) {
            diffDiv.style.background = 'var(--warning-50)';
            diffDiv.style.color = 'var(--warning-600)';
            diffDiv.textContent = t('payment_diff_less', { amount: Math.abs(diff).toFixed(2) });
        } else {
            diffDiv.style.background = 'var(--success-50)';
            diffDiv.style.color = 'var(--success-700)';
            diffDiv.textContent = t('payment_diff_exact');
        }
    },

    async save(event) {
        event.preventDefault();
        const id = document.getElementById('payment-id').value;
        const payment = {
            billId: document.getElementById('payment-bill').value,
            amount: parseFloat(document.getElementById('payment-amount').value),
            paymentDate: document.getElementById('payment-date').value,
            method: document.getElementById('payment-method').value,
            notes: document.getElementById('payment-notes').value
        };

        try {
            if (id) {
                payment.id = id;
                const existing = await storage.getById('payments', id);
                payment.createdAt = existing.createdAt;
                await storage.update('payments', payment);
                App.showToast(t('payment_updated'), 'success');
            } else {
                await storage.add('payments', payment);
                App.showToast(t('payment_created'), 'success');
            }
            await this.updateBillStatus(payment.billId);
            Modal.close('payment-modal');
            await this.loadTable();
        } catch (err) {
            App.showToast('Error: ' + err.message, 'error');
        }
    },

    async updateBillStatus(billId) {
        const bill = await storage.getById('bills', billId);
        if (!bill) return;
        const payments = await storage.getByIndex('payments', 'billId', billId);
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        if (totalPaid >= bill.amount) bill.status = 'paid';
        else if (totalPaid > 0) bill.status = 'partial';
        await storage.update('bills', bill);
    },

    async edit(id) {
        const payment = await storage.getById('payments', id);
        if (payment) await this.openForm(payment);
    },

    async deletePayment(id) {
        const confirmed = await Modal.confirm(t('payment_delete_confirm_title'), t('payment_delete_confirm_msg'));
        if (confirmed) {
            const payment = await storage.getById('payments', id);
            await storage.delete('payments', id);
            if (payment) await this.updateBillStatus(payment.billId);
            App.showToast(t('payment_deleted'), 'success');
            await this.loadTable();
        }
    },

    formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString(i18n.getLocale(), { month: 'short', day: 'numeric', year: 'numeric' });
    },

    getMethodBadge(method) {
        const map = {
            pix: `<span class="badge badge-success">💲 ${t('method_pix')}</span>`,
            credit_card: `<span class="badge badge-primary">💳 ${t('method_credit_card')}</span>`,
            debit_card: `<span class="badge badge-info">💳 ${t('method_debit_card')}</span>`,
            bank_transfer: `<span class="badge badge-neutral">🏦 ${t('method_bank_transfer')}</span>`,
            cash: `<span class="badge badge-warning">💵 ${t('method_cash')}</span>`,
            boleto: `<span class="badge badge-neutral">📄 ${t('method_boleto')}</span>`,
            vr: `<span class="badge badge-info">🍽️ ${t('method_vr')}</span>`,
            va: `<span class="badge badge-info">🛒 ${t('method_va')}</span>`
        };
        return map[method] || method;
    }
};
