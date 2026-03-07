/**
 * debts.js — Debt Renegotiation Manager (i18n)
 */

const Debts = {
    async render() {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="kpi-grid" id="debts-kpis"></div>

            <div class="table-container">
                <div class="table-header">
                    <h3>${t('debts_title')}</h3>
                    <div class="table-filters">
                        <select class="filter-select" id="debts-filter-status">
                            <option value="">${t('debts_all_status')}</option>
                            <option value="active">${t('debts_status_active')}</option>
                            <option value="completed">${t('debts_status_completed')}</option>
                        </select>
                        <button class="btn btn-primary" onclick="Debts.openForm()">
                            ${t('debts_new')}
                        </button>
                    </div>
                </div>
                <div id="debts-list"></div>
            </div>

            <!-- Renegotiation Form Modal -->
            <div class="modal-overlay" id="debt-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="debt-modal-title">${t('debts_modal_new')}</h3>
                        <button class="modal-close" onclick="Modal.close('debt-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="debt-form" onsubmit="Debts.save(event)">
                            <input type="hidden" id="debt-id">
                            <div class="form-group">
                                <label>${t('nav_bills')} <span class="required">${t('required')}</span></label>
                                <select id="debt-bill" required onchange="Debts.onBillSelect()">
                                    <option value="">${t('debts_select_bill')}</option>
                                </select>
                            </div>
                            <div id="debt-bill-info" class="hidden" style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-sm); font-size: 13px;"></div>
                            <div class="form-group">
                                <label>${t('debts_creditor')}</label>
                                <input type="text" id="debt-creditor" placeholder="${t('debts_creditor')}">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>${t('debts_reno_total')} <span class="required">${t('required')}</span></label>
                                    <input type="number" id="debt-total" step="0.01" min="0" required placeholder="0.00" oninput="Debts.calcInstallment()">
                                </div>
                                <div class="form-group">
                                    <label>${t('debts_interest_rate')}</label>
                                    <input type="number" id="debt-interest" step="0.01" min="0" placeholder="0.00">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>${t('debts_num_installments')} <span class="required">${t('required')}</span></label>
                                    <input type="number" id="debt-installments" min="1" required placeholder="12" oninput="Debts.calcInstallment()">
                                </div>
                                <div class="form-group">
                                    <label>${t('debts_installment_value')}</label>
                                    <input type="number" id="debt-installment-value" step="0.01" readonly placeholder="${t('debts_auto_calculated')}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>${t('debts_first_due_date')} <span class="required">${t('required')}</span></label>
                                <input type="date" id="debt-start-date" required>
                            </div>
                            <div class="form-group">
                                <label>${t('notes')}</label>
                                <textarea id="debt-notes" placeholder="${t('debts_notes_placeholder')}"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="Modal.close('debt-modal')">${t('cancel')}</button>
                        <button class="btn btn-primary" onclick="document.getElementById('debt-form').requestSubmit()">${t('debts_save')}</button>
                    </div>
                </div>
            </div>

            <!-- Installment Details Modal -->
            <div class="modal-overlay" id="installment-modal">
                <div class="modal-content" style="max-width: 640px;">
                    <div class="modal-header">
                        <h3>${t('debts_installment_schedule')}</h3>
                        <button class="modal-close" onclick="Modal.close('installment-modal')">&times;</button>
                    </div>
                    <div class="modal-body" id="installment-content"></div>
                </div>
            </div>
        `;

        await this.loadKPIs();
        await this.loadList();
        this.bindFilters();
    },

    bindFilters() {
        document.getElementById('debts-filter-status').addEventListener('change', () => this.loadList());
    },

    async loadKPIs() {
        const renos = await storage.getAll('renegotiations');
        const activeRenos = renos.filter(r => r.status === 'active');
        const totalDebt = activeRenos.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);
        const totalPaid = activeRenos.reduce((sum, r) => {
            const paidInstallments = (r.installments || []).filter(i => i.paid);
            return sum + paidInstallments.reduce((s, i) => s + parseFloat(i.amount), 0);
        }, 0);
        const totalRemaining = totalDebt - totalPaid;
        const pendingInstallments = activeRenos.reduce((sum, r) => {
            return sum + (r.installments || []).filter(i => !i.paid).length;
        }, 0);

        document.getElementById('debts-kpis').innerHTML = `
            <div class="kpi-card primary">
                <div class="kpi-header">
                    <span class="kpi-label">${t('debts_kpi_active')}</span>
                    <div class="kpi-icon">🔄</div>
                </div>
                <div class="kpi-value">${activeRenos.length}</div>
            </div>
            <div class="kpi-card danger">
                <div class="kpi-header">
                    <span class="kpi-label">${t('debts_kpi_total_reno')}</span>
                    <div class="kpi-icon">💰</div>
                </div>
                <div class="kpi-value">R$ ${totalDebt.toFixed(2)}</div>
            </div>
            <div class="kpi-card success">
                <div class="kpi-header">
                    <span class="kpi-label">${t('debts_kpi_total_paid')}</span>
                    <div class="kpi-icon">✅</div>
                </div>
                <div class="kpi-value">R$ ${totalPaid.toFixed(2)}</div>
            </div>
            <div class="kpi-card warning">
                <div class="kpi-header">
                    <span class="kpi-label">${t('debts_kpi_remaining')}</span>
                    <div class="kpi-icon">⏳</div>
                </div>
                <div class="kpi-value">R$ ${totalRemaining.toFixed(2)}</div>
                <div class="kpi-subtitle">${t('debts_kpi_installments_pending', { n: pendingInstallments })}</div>
            </div>
        `;
    },

    async loadList() {
        const renos = await storage.getAll('renegotiations');
        const bills = await storage.getAll('bills');
        const billMap = {};
        bills.forEach(b => billMap[b.id] = b);

        const statusFilter = document.getElementById('debts-filter-status')?.value || '';
        let filtered = renos;
        if (statusFilter) filtered = renos.filter(r => r.status === statusFilter);
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const container = document.getElementById('debts-list');

        if (filtered.length === 0) {
            container.innerHTML = `<div class="table-empty"><div class="empty-icon">🔄</div><p>${t('debts_no_renos')}</p></div>`;
            return;
        }

        container.innerHTML = filtered.map(reno => {
            const bill = billMap[reno.billId];
            const installments = reno.installments || [];
            const paidCount = installments.filter(i => i.paid).length;
            const totalPaid = installments.filter(i => i.paid).reduce((s, i) => s + parseFloat(i.amount), 0);
            const remaining = parseFloat(reno.totalAmount) - totalPaid;
            const progress = installments.length > 0 ? (paidCount / installments.length) * 100 : 0;

            return `
                <div style="padding: 20px 24px; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                        <div>
                            <strong style="font-size: 16px;">${bill ? bill.name : t('unknown')}</strong>
                            <span class="badge ${reno.status === 'active' ? 'badge-primary' : 'badge-success'}" style="margin-left: 8px;">
                                ${reno.status === 'active' ? t('status_active') : t('status_completed')}
                            </span>
                            ${reno.creditor ? `<br><span class="text-muted" style="font-size: 13px;">${t('debts_creditor')}: ${reno.creditor}</span>` : ''}
                        </div>
                        <div class="action-btns">
                            <button class="btn btn-outline btn-sm" onclick="Debts.showInstallments('${reno.id}')">${t('debts_view_installments')}</button>
                            <button class="btn btn-ghost btn-icon" title="${t('delete')}" onclick="Debts.deleteReno('${reno.id}')">🗑️</button>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 12px; font-size: 13px;">
                        <div><span class="text-muted">${t('debts_col_total')}:</span> <strong>R$ ${parseFloat(reno.totalAmount).toFixed(2)}</strong></div>
                        <div><span class="text-muted">${t('debts_col_installments')}:</span> <strong>${paidCount}/${installments.length}</strong></div>
                        <div><span class="text-muted">${t('debts_col_paid')}:</span> <strong class="text-success">R$ ${totalPaid.toFixed(2)}</strong></div>
                        <div><span class="text-muted">${t('debts_col_remaining')}:</span> <strong class="${remaining > 0 ? 'text-danger' : 'text-success'}">R$ ${remaining.toFixed(2)}</strong></div>
                        ${reno.interestRate ? `<div><span class="text-muted">${t('debts_col_interest')}:</span> <strong>${reno.interestRate}%</strong></div>` : ''}
                    </div>
                    <div style="background: var(--bg-secondary); border-radius: 8px; height: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, var(--success-500), var(--success-600)); height: 100%; width: ${progress}%; border-radius: 8px; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="text-align: right; font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${progress.toFixed(0)}% ${t('complete')}</div>
                </div>
            `;
        }).join('');
    },

    async openForm() {
        document.getElementById('debt-modal-title').textContent = t('debts_modal_new');
        document.getElementById('debt-id').value = '';
        document.getElementById('debt-creditor').value = '';
        document.getElementById('debt-total').value = '';
        document.getElementById('debt-interest').value = '';
        document.getElementById('debt-installments').value = '';
        document.getElementById('debt-installment-value').value = '';
        document.getElementById('debt-start-date').value = '';
        document.getElementById('debt-notes').value = '';
        document.getElementById('debt-bill-info').classList.add('hidden');

        const bills = await storage.getAll('bills');
        const select = document.getElementById('debt-bill');
        select.innerHTML = `<option value="">${t('debts_select_bill')}</option>`;
        bills.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = `${b.name} — R$ ${parseFloat(b.amount).toFixed(2)} (${b.status || 'pending'})`;
            select.appendChild(opt);
        });

        Modal.open('debt-modal');
    },

    async onBillSelect() {
        const billId = document.getElementById('debt-bill').value;
        const infoDiv = document.getElementById('debt-bill-info');
        if (!billId) { infoDiv.classList.add('hidden'); return; }

        const bill = await storage.getById('bills', billId);
        const payments = await storage.getByIndex('payments', 'billId', billId);
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const outstanding = Math.max(0, bill.amount - totalPaid);

        infoDiv.classList.remove('hidden');
        infoDiv.innerHTML = `
            <strong>${bill.name}</strong> — ${t('debts_original')}: R$ ${parseFloat(bill.amount).toFixed(2)} |
            ${t('debts_col_paid')}: R$ ${totalPaid.toFixed(2)} |
            ${t('debts_outstanding')}: <strong class="text-danger">R$ ${outstanding.toFixed(2)}</strong>
        `;

        document.getElementById('debt-total').value = outstanding.toFixed(2);
        document.getElementById('debt-creditor').value = bill.creditor || '';
        this.calcInstallment();
    },

    calcInstallment() {
        const total = parseFloat(document.getElementById('debt-total').value) || 0;
        const count = parseInt(document.getElementById('debt-installments').value) || 0;
        const field = document.getElementById('debt-installment-value');
        if (total > 0 && count > 0) field.value = (total / count).toFixed(2);
        else field.value = '';
    },

    async save(event) {
        event.preventDefault();
        const totalAmount = parseFloat(document.getElementById('debt-total').value);
        const numInstallments = parseInt(document.getElementById('debt-installments').value);
        const startDate = document.getElementById('debt-start-date').value;
        const installmentValue = totalAmount / numInstallments;

        const installments = [];
        for (let i = 0; i < numInstallments; i++) {
            const dueDate = new Date(startDate + 'T00:00:00');
            dueDate.setMonth(dueDate.getMonth() + i);
            installments.push({
                number: i + 1,
                amount: installmentValue,
                dueDate: dueDate.toISOString().split('T')[0],
                paid: false,
                paidDate: null
            });
        }

        const reno = {
            billId: document.getElementById('debt-bill').value,
            creditor: document.getElementById('debt-creditor').value,
            totalAmount, numInstallments, installmentValue,
            interestRate: parseFloat(document.getElementById('debt-interest').value) || 0,
            startDate,
            notes: document.getElementById('debt-notes').value,
            installments,
            status: 'active'
        };

        try {
            const id = document.getElementById('debt-id').value;
            if (id) {
                reno.id = id;
                const existing = await storage.getById('renegotiations', id);
                reno.createdAt = existing.createdAt;
                await storage.update('renegotiations', reno);
                App.showToast(t('debts_updated'), 'success');
            } else {
                await storage.add('renegotiations', reno);
                App.showToast(t('debts_created'), 'success');
            }
            Modal.close('debt-modal');
            await this.loadKPIs();
            await this.loadList();
        } catch (err) {
            App.showToast('Error: ' + err.message, 'error');
        }
    },

    async showInstallments(renoId) {
        const reno = await storage.getById('renegotiations', renoId);
        const content = document.getElementById('installment-content');
        const installments = reno.installments || [];

        content.innerHTML = `
            <div style="margin-bottom: 16px; font-size: 14px;">
                <strong>${t('debts_installment_total')}:</strong> R$ ${parseFloat(reno.totalAmount).toFixed(2)} |
                <strong>${t('debts_installment_value_label')}:</strong> R$ ${reno.installmentValue.toFixed(2)} |
                <strong>${t('debts_installment_interest')}:</strong> ${reno.interestRate || 0}%
            </div>
            <div class="installment-timeline">
                ${installments.map(inst => `
                    <div class="installment-item ${inst.paid ? 'paid' : ''}">
                        <div class="installment-number">${inst.number}</div>
                        <div class="installment-info">
                            <div class="inst-amount">R$ ${parseFloat(inst.amount).toFixed(2)}</div>
                            <div class="inst-date">${t('debts_due')}: ${this.formatDate(inst.dueDate)}${inst.paid ? ` — ${t('debts_paid_on')}: ${this.formatDate(inst.paidDate)}` : ''}</div>
                        </div>
                        <div>
                            ${inst.paid
                                ? `<span class="badge badge-success">${t('status_paid')}</span>`
                                : `<button class="btn btn-sm btn-success" onclick="Debts.markPaid('${renoId}', ${inst.number})">${t('debts_mark_paid')}</button>`
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        Modal.open('installment-modal');
    },

    async markPaid(renoId, installmentNumber) {
        const reno = await storage.getById('renegotiations', renoId);
        const inst = reno.installments.find(i => i.number === installmentNumber);
        if (inst) {
            inst.paid = true;
            inst.paidDate = new Date().toISOString().split('T')[0];
            const allPaid = reno.installments.every(i => i.paid);
            if (allPaid) reno.status = 'completed';
            await storage.update('renegotiations', reno);
            App.showToast(t('debts_installment_marked', { n: installmentNumber }), 'success');
            await this.showInstallments(renoId);
            await this.loadKPIs();
            await this.loadList();
        }
    },

    async deleteReno(id) {
        const confirmed = await Modal.confirm(t('debts_delete_confirm_title'), t('debts_delete_confirm_msg'));
        if (confirmed) {
            await storage.delete('renegotiations', id);
            App.showToast(t('debts_deleted'), 'success');
            await this.loadKPIs();
            await this.loadList();
        }
    },

    formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString(i18n.getLocale(), { month: 'short', day: 'numeric', year: 'numeric' });
    }
};
