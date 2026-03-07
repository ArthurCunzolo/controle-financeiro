/**
 * bills.js — Bills Management Module (i18n)
 */

const Bills = {
    async render() {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h3>${t('bills_title')}</h3>
                    <div class="table-filters">
                        <div class="search-input">
                            <span class="search-icon">🔍</span>
                            <input type="text" id="bills-search" placeholder="${t('bills_search')}" style="width: 200px;">
                        </div>
                        <select class="filter-select" id="bills-filter-category">
                            <option value="">${t('bills_all_categories')}</option>
                            <option value="housing">${t('cat_housing')}</option>
                            <option value="credit_card">${t('cat_credit_card')}</option>
                            <option value="loan">${t('cat_loan')}</option>
                            <option value="utilities">${t('cat_utilities')}</option>
                            <option value="food">${t('cat_food')}</option>
                            <option value="transport">${t('cat_transport')}</option>
                            <option value="health">${t('cat_health')}</option>
                            <option value="education">${t('cat_education')}</option>
                            <option value="entertainment">${t('cat_entertainment')}</option>
                            <option value="insurance">${t('cat_insurance')}</option>
                            <option value="subscription">${t('cat_subscription')}</option>
                            <option value="other">${t('cat_other')}</option>
                        </select>
                        <select class="filter-select" id="bills-filter-status">
                            <option value="">${t('bills_all_status')}</option>
                            <option value="pending">${t('status_pending')}</option>
                            <option value="paid">${t('status_paid')}</option>
                            <option value="overdue">${t('status_overdue')}</option>
                            <option value="partial">${t('status_partial')}</option>
                        </select>
                        <select class="filter-select" id="bills-filter-month">
                            <option value="">${t('bills_all_months')}</option>
                        </select>
                        <button class="btn btn-primary" onclick="Bills.openForm()">
                            ${t('bills_new')}
                        </button>
                    </div>
                </div>
                <div class="table-responsive" id="bills-table-wrapper"></div>
            </div>

            <!-- Bill Form Modal -->
            <div class="modal-overlay" id="bill-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="bill-modal-title">${t('bills_modal_new')}</h3>
                        <button class="modal-close" onclick="Modal.close('bill-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="bill-form" onsubmit="Bills.save(event)">
                            <input type="hidden" id="bill-id">
                            <div class="form-group">
                                <label>${t('bill_name')} <span class="required">${t('required')}</span></label>
                                <input type="text" id="bill-name" required placeholder="${t('bill_name_placeholder')}">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>${t('bill_category')} <span class="required">${t('required')}</span></label>
                                    <select id="bill-category" required>
                                        <option value="">${t('select')}</option>
                                        <option value="housing">${t('cat_housing')}</option>
                                        <option value="credit_card">${t('cat_credit_card')}</option>
                                        <option value="loan">${t('cat_loan')}</option>
                                        <option value="utilities">${t('cat_utilities')}</option>
                                        <option value="food">${t('cat_food')}</option>
                                        <option value="transport">${t('cat_transport')}</option>
                                        <option value="health">${t('cat_health')}</option>
                                        <option value="education">${t('cat_education')}</option>
                                        <option value="entertainment">${t('cat_entertainment')}</option>
                                        <option value="insurance">${t('cat_insurance')}</option>
                                        <option value="subscription">${t('cat_subscription')}</option>
                                        <option value="other">${t('cat_other')}</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>${t('bill_creditor')}</label>
                                    <input type="text" id="bill-creditor" placeholder="${t('bill_creditor_placeholder')}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>${t('bill_amount')} <span class="required">${t('required')}</span></label>
                                    <input type="number" id="bill-amount" step="0.01" min="0" required placeholder="0.00">
                                </div>
                                <div class="form-group">
                                    <label>${t('bill_due_date')} <span class="required">${t('required')}</span></label>
                                    <input type="date" id="bill-due-date" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>${t('bill_type')} <span class="required">${t('required')}</span></label>
                                <select id="bill-type" required onchange="Bills.toggleInstallmentFields()">
                                    <option value="one_time">${t('bill_type_one_time')}</option>
                                    <option value="recurring">${t('bill_type_recurring')}</option>
                                    <option value="installment">${t('bill_type_installment')}</option>
                                </select>
                            </div>
                            <div id="installment-fields" class="hidden">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>${t('bill_total_installments')}</label>
                                        <input type="number" id="bill-total-installments" min="1" placeholder="12">
                                    </div>
                                    <div class="form-group">
                                        <label>${t('bill_current_installment')}</label>
                                        <input type="number" id="bill-current-installment" min="1" placeholder="1">
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>${t('bill_tags')}</label>
                                <input type="text" id="bill-tags" placeholder="${t('bill_tags_placeholder')}">
                            </div>
                            <div class="form-group">
                                <label>${t('notes')}</label>
                                <textarea id="bill-notes" placeholder="${t('bill_notes_placeholder')}"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="Modal.close('bill-modal')">${t('cancel')}</button>
                        <button class="btn btn-primary" onclick="document.getElementById('bill-form').requestSubmit()">${t('bills_save')}</button>
                    </div>
                </div>
            </div>

            <!-- Payment History Modal -->
            <div class="modal-overlay" id="payment-history-modal">
                <div class="modal-content" style="max-width: 640px;">
                    <div class="modal-header">
                        <h3>${t('bill_payment_history')}</h3>
                        <button class="modal-close" onclick="Modal.close('payment-history-modal')">&times;</button>
                    </div>
                    <div class="modal-body" id="payment-history-content"></div>
                </div>
            </div>
        `;

        this.populateMonthFilter();
        await this.loadTable();
        this.bindFilters();
    },

    populateMonthFilter() {
        const select = document.getElementById('bills-filter-month');
        const now = new Date();
        const locale = i18n.getLocale();
        for (let i = -3; i <= 12; i++) {
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
        ['bills-search', 'bills-filter-category', 'bills-filter-status', 'bills-filter-month'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.loadTable());
            document.getElementById(id).addEventListener('change', () => this.loadTable());
        });
    },

    async loadTable() {
        const bills = await storage.getAll('bills');
        const payments = await storage.getAll('payments');
        let filtered = this.applyFilters(bills);

        filtered = filtered.map(bill => {
            const billPayments = payments.filter(p => p.billId === bill.id);
            const totalPaid = billPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            const now = new Date();
            const dueDate = new Date(bill.dueDate);

            if (totalPaid >= bill.amount) bill.status = 'paid';
            else if (totalPaid > 0) bill.status = 'partial';
            else if (dueDate < now && bill.status !== 'paid') bill.status = 'overdue';
            else if (bill.status !== 'paid') bill.status = 'pending';

            bill.totalPaid = totalPaid;
            bill.remaining = Math.max(0, bill.amount - totalPaid);
            return bill;
        });

        filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        const wrapper = document.getElementById('bills-table-wrapper');

        if (filtered.length === 0) {
            wrapper.innerHTML = `<div class="table-empty"><div class="empty-icon">📋</div><p>${t('bills_no_bills')}</p></div>`;
            return;
        }

        wrapper.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>${t('bill_col_bill')}</th>
                        <th>${t('bill_col_category')}</th>
                        <th>${t('bill_col_amount')}</th>
                        <th>${t('bill_col_due_date')}</th>
                        <th>${t('bill_col_type')}</th>
                        <th>${t('bill_col_status')}</th>
                        <th>${t('bill_col_paid')}</th>
                        <th>${t('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(bill => `
                        <tr>
                            <td>
                                <strong>${bill.name}</strong>
                                ${bill.creditor ? `<br><span class="text-muted" style="font-size:12px">${bill.creditor}</span>` : ''}
                            </td>
                            <td>${this.getCategoryBadge(bill.category)}</td>
                            <td><strong>R$ ${parseFloat(bill.amount).toFixed(2)}</strong></td>
                            <td>${this.formatDate(bill.dueDate)}</td>
                            <td>${this.getTypeBadge(bill)}</td>
                            <td>${this.getStatusBadge(bill.status)}</td>
                            <td><span class="${bill.totalPaid > 0 ? 'text-success' : 'text-muted'}">R$ ${bill.totalPaid.toFixed(2)}</span></td>
                            <td>
                                <div class="action-btns">
                                    <button class="btn btn-ghost btn-icon" title="Pay" onclick="Bills.quickPay('${bill.id}')">💰</button>
                                    <button class="btn btn-ghost btn-icon" title="History" onclick="Bills.showHistory('${bill.id}')">📜</button>
                                    <button class="btn btn-ghost btn-icon" title="${t('edit')}" onclick="Bills.edit('${bill.id}')">✏️</button>
                                    <button class="btn btn-ghost btn-icon" title="${t('delete')}" onclick="Bills.deleteBill('${bill.id}')">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    applyFilters(bills) {
        const search = document.getElementById('bills-search')?.value?.toLowerCase() || '';
        const category = document.getElementById('bills-filter-category')?.value || '';
        const status = document.getElementById('bills-filter-status')?.value || '';
        const month = document.getElementById('bills-filter-month')?.value || '';

        return bills.filter(bill => {
            if (search && !bill.name.toLowerCase().includes(search) &&
                !(bill.creditor && bill.creditor.toLowerCase().includes(search))) return false;
            if (category && bill.category !== category) return false;
            if (status && bill.status !== status) return false;
            if (month) {
                const billMonth = bill.dueDate.substring(0, 7);
                if (billMonth !== month) return false;
            }
            return true;
        });
    },

    openForm(bill = null) {
        document.getElementById('bill-modal-title').textContent = bill ? t('bills_modal_edit') : t('bills_modal_new');
        document.getElementById('bill-id').value = bill ? bill.id : '';
        document.getElementById('bill-name').value = bill ? bill.name : '';
        document.getElementById('bill-category').value = bill ? bill.category : '';
        document.getElementById('bill-creditor').value = bill ? (bill.creditor || '') : '';
        document.getElementById('bill-amount').value = bill ? bill.amount : '';
        document.getElementById('bill-due-date').value = bill ? bill.dueDate : '';
        document.getElementById('bill-type').value = bill ? bill.type : 'one_time';
        document.getElementById('bill-total-installments').value = bill ? (bill.totalInstallments || '') : '';
        document.getElementById('bill-current-installment').value = bill ? (bill.currentInstallment || '') : '';
        document.getElementById('bill-tags').value = bill ? (bill.tags || []).join(', ') : '';
        document.getElementById('bill-notes').value = bill ? (bill.notes || '') : '';
        this.toggleInstallmentFields();
        Modal.open('bill-modal');
    },

    toggleInstallmentFields() {
        const type = document.getElementById('bill-type').value;
        const fields = document.getElementById('installment-fields');
        if (type === 'installment') fields.classList.remove('hidden');
        else fields.classList.add('hidden');
    },

    async save(event) {
        event.preventDefault();
        const id = document.getElementById('bill-id').value;
        const tagsVal = document.getElementById('bill-tags').value;
        const bill = {
            name: document.getElementById('bill-name').value,
            category: document.getElementById('bill-category').value,
            creditor: document.getElementById('bill-creditor').value,
            amount: parseFloat(document.getElementById('bill-amount').value),
            dueDate: document.getElementById('bill-due-date').value,
            type: document.getElementById('bill-type').value,
            totalInstallments: parseInt(document.getElementById('bill-total-installments').value) || null,
            currentInstallment: parseInt(document.getElementById('bill-current-installment').value) || null,
            tags: tagsVal ? tagsVal.split(',').map(t => t.trim()) : [],
            notes: document.getElementById('bill-notes').value,
            status: 'pending'
        };

        try {
            if (id) {
                bill.id = id;
                const existing = await storage.getById('bills', id);
                bill.status = existing.status;
                bill.createdAt = existing.createdAt;
                await storage.update('bills', bill);
                App.showToast(t('bill_updated'), 'success');
            } else {
                await storage.add('bills', bill);
                App.showToast(t('bill_created'), 'success');
            }
            Modal.close('bill-modal');
            await this.loadTable();
        } catch (err) {
            App.showToast('Error: ' + err.message, 'error');
        }
    },

    async edit(id) {
        const bill = await storage.getById('bills', id);
        if (bill) this.openForm(bill);
    },

    async deleteBill(id) {
        const confirmed = await Modal.confirm(t('bill_delete_confirm_title'), t('bill_delete_confirm_msg'));
        if (confirmed) {
            await storage.delete('bills', id);
            const payments = await storage.getByIndex('payments', 'billId', id);
            for (const p of payments) await storage.delete('payments', p.id);
            App.showToast(t('bill_deleted'), 'success');
            await this.loadTable();
        }
    },

    async quickPay(billId) {
        window.location.hash = 'payments';
        setTimeout(() => { Payments.openForm(null, billId); }, 100);
    },

    async showHistory(billId) {
        const bill = await storage.getById('bills', billId);
        const payments = await storage.getByIndex('payments', 'billId', billId);
        const content = document.getElementById('payment-history-content');

        if (payments.length === 0) {
            content.innerHTML = `<div class="text-center text-muted" style="padding: 24px;"><p>${t('bill_no_payments', { name: bill.name })}</p></div>`;
        } else {
            const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            content.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <strong>${bill.name}</strong> — ${t('bill_history_expected')}: R$ ${parseFloat(bill.amount).toFixed(2)} |
                    ${t('bill_history_paid')}: <span class="text-success">R$ ${totalPaid.toFixed(2)}</span> |
                    ${t('bill_history_remaining')}: <span class="${totalPaid >= bill.amount ? 'text-success' : 'text-danger'}">R$ ${Math.max(0, bill.amount - totalPaid).toFixed(2)}</span>
                </div>
                <table>
                    <thead><tr><th>${t('bill_col_date')}</th><th>${t('bill_col_amount')}</th><th>${t('bill_col_method')}</th><th>${t('notes')}</th></tr></thead>
                    <tbody>
                        ${payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).map(p => `
                            <tr>
                                <td>${this.formatDate(p.paymentDate)}</td>
                                <td><strong>R$ ${parseFloat(p.amount).toFixed(2)}</strong></td>
                                <td>${this.getMethodLabel(p.method)}</td>
                                <td class="text-muted">${p.notes || '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        Modal.open('payment-history-modal');
    },

    formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString(i18n.getLocale(), { month: 'short', day: 'numeric', year: 'numeric' });
    },

    getCategoryBadge(category) {
        const key = `cat_${category}`;
        return `<span class="badge badge-neutral">${t(key)}</span>`;
    },

    getTypeBadge(bill) {
        if (bill.type === 'installment') return `<span class="badge badge-info">📊 ${bill.currentInstallment || '?'}/${bill.totalInstallments || '?'}</span>`;
        if (bill.type === 'recurring') return `<span class="badge badge-primary">${t('type_recurring')}</span>`;
        return `<span class="badge badge-neutral">${t('type_one_time')}</span>`;
    },

    getStatusBadge(status) {
        const map = {
            pending: `<span class="badge badge-warning">${t('status_pending')}</span>`,
            paid: `<span class="badge badge-success">${t('status_paid')}</span>`,
            overdue: `<span class="badge badge-danger">${t('status_overdue')}</span>`,
            partial: `<span class="badge badge-info">${t('status_partial')}</span>`
        };
        return map[status] || status;
    },

    getMethodLabel(method) {
        const key = `method_${method}`;
        return t(key);
    }
};
