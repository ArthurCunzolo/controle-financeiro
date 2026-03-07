/**
 * dashboard.js — Financial Dashboard Module (i18n)
 */

const Dashboard = {
    charts: {},

    async render() {
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="kpi-grid" id="dashboard-kpis"></div>
            <div class="alerts-grid" id="dashboard-alerts"></div>

            <div class="charts-grid">
                <div class="card">
                    <div class="card-header"><h3>${t('chart_expenses_category')}</h3></div>
                    <div class="card-body"><div class="chart-wrapper"><canvas id="chart-category"></canvas></div></div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>${t('chart_expenses_method')}</h3></div>
                    <div class="card-body"><div class="chart-wrapper"><canvas id="chart-method"></canvas></div></div>
                </div>
            </div>
            <div class="charts-grid">
                <div class="card">
                    <div class="card-header"><h3>${t('chart_monthly_trend')}</h3></div>
                    <div class="card-body"><div class="chart-wrapper"><canvas id="chart-trend"></canvas></div></div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>${t('chart_paid_vs_pending')}</h3></div>
                    <div class="card-body"><div class="chart-wrapper"><canvas id="chart-status"></canvas></div></div>
                </div>
            </div>

            <div class="card" style="margin-top: 4px;">
                <div class="card-header"><h3>${t('recent_payments')}</h3></div>
                <div class="card-body no-padding" id="recent-payments"></div>
            </div>
        `;
        await this.loadAll();
    },

    async loadAll() {
        const bills = await storage.getAll('bills');
        const payments = await storage.getAll('payments');
        const renos = await storage.getAll('renegotiations');

        this.computeStatuses(bills, payments);
        this.renderKPIs(bills, payments, renos);
        this.renderAlerts(bills, renos);
        this.renderCharts(bills, payments);
        this.renderRecentPayments(payments, bills);

        const overdue = bills.filter(b => b.status === 'overdue').length;
        Sidebar.updateBadge(overdue);
    },

    computeStatuses(bills, payments) {
        const now = new Date();
        bills.forEach(bill => {
            const billPayments = payments.filter(p => p.billId === bill.id);
            const totalPaid = billPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            const dueDate = new Date(bill.dueDate + 'T00:00:00');
            if (totalPaid >= bill.amount) bill.status = 'paid';
            else if (totalPaid > 0) bill.status = 'partial';
            else if (dueDate < now) bill.status = 'overdue';
            else bill.status = 'pending';
            bill.totalPaid = totalPaid;
        });
    },

    renderKPIs(bills, payments, renos) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        const monthlyBills = bills.filter(b => b.dueDate.startsWith(currentMonth));
        const totalExpenses = monthlyBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
        const monthlyPayments = payments.filter(p => p.paymentDate.startsWith(currentMonth));
        const totalPaid = monthlyPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const pendingBills = bills.filter(b => b.status === 'pending' || b.status === 'partial');
        const totalPending = pendingBills.reduce((sum, b) => sum + Math.max(0, parseFloat(b.amount) - (b.totalPaid || 0)), 0);
        const overdueBills = bills.filter(b => b.status === 'overdue');
        const totalOverdue = overdueBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
        const activeRenos = renos.filter(r => r.status === 'active');
        const totalRenoDebt = activeRenos.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);

        document.getElementById('dashboard-kpis').innerHTML = `
            <div class="kpi-card primary">
                <div class="kpi-header"><span class="kpi-label">${t('kpi_monthly_expenses')}</span><div class="kpi-icon">📊</div></div>
                <div class="kpi-value">R$ ${totalExpenses.toFixed(2)}</div>
                <div class="kpi-subtitle">${t('kpi_bills_this_month', { n: monthlyBills.length })}</div>
            </div>
            <div class="kpi-card success">
                <div class="kpi-header"><span class="kpi-label">${t('kpi_paid_this_month')}</span><div class="kpi-icon">✅</div></div>
                <div class="kpi-value">R$ ${totalPaid.toFixed(2)}</div>
                <div class="kpi-subtitle">${t('kpi_payments_made', { n: monthlyPayments.length })}</div>
            </div>
            <div class="kpi-card warning">
                <div class="kpi-header"><span class="kpi-label">${t('kpi_pending_bills')}</span><div class="kpi-icon">⏳</div></div>
                <div class="kpi-value">R$ ${totalPending.toFixed(2)}</div>
                <div class="kpi-subtitle">${t('kpi_bills_pending', { n: pendingBills.length })}</div>
            </div>
            <div class="kpi-card danger">
                <div class="kpi-header"><span class="kpi-label">${t('kpi_overdue')}</span><div class="kpi-icon">🔴</div></div>
                <div class="kpi-value">R$ ${totalOverdue.toFixed(2)}</div>
                <div class="kpi-subtitle">${t('kpi_overdue_bills', { n: overdueBills.length })}</div>
            </div>
            <div class="kpi-card info">
                <div class="kpi-header"><span class="kpi-label">${t('kpi_renegotiated_debt')}</span><div class="kpi-icon">🔄</div></div>
                <div class="kpi-value">R$ ${totalRenoDebt.toFixed(2)}</div>
                <div class="kpi-subtitle">${t('kpi_active_renegotiations', { n: activeRenos.length })}</div>
            </div>
        `;
    },

    renderAlerts(bills, renos) {
        const now = new Date();
        const in7Days = new Date();
        in7Days.setDate(in7Days.getDate() + 7);

        const dueSoon = bills.filter(b => {
            if (b.status === 'paid') return false;
            const due = new Date(b.dueDate + 'T00:00:00');
            return due >= now && due <= in7Days;
        });
        const overdue = bills.filter(b => b.status === 'overdue');
        const pendingInstallments = [];
        renos.filter(r => r.status === 'active').forEach(r => {
            (r.installments || []).filter(i => !i.paid).forEach(i => {
                pendingInstallments.push({ ...i, renoId: r.id, billId: r.billId });
            });
        });

        const container = document.getElementById('dashboard-alerts');

        if (dueSoon.length === 0 && overdue.length === 0 && pendingInstallments.length === 0) {
            container.innerHTML = `
                <div class="alert-card alert-info" style="grid-column: 1/-1;">
                    <h4>${t('alert_all_clear')}</h4>
                    <p style="font-size: 13px; color: var(--text-secondary);">${t('alert_all_clear_msg')}</p>
                </div>
            `;
            return;
        }

        let html = '';
        if (overdue.length > 0) {
            html += `
                <div class="alert-card alert-danger">
                    <h4>${t('alert_overdue', { n: overdue.length })}</h4>
                    <ul class="alert-list">
                        ${overdue.slice(0, 5).map(b => `
                            <li><span>${b.name}</span><strong>R$ ${parseFloat(b.amount).toFixed(2)}</strong></li>
                        `).join('')}
                        ${overdue.length > 5 ? `<li class="text-muted">${t('alert_and_more', { n: overdue.length - 5 })}</li>` : ''}
                    </ul>
                </div>
            `;
        }
        if (dueSoon.length > 0) {
            html += `
                <div class="alert-card alert-warning">
                    <h4>${t('alert_due_soon', { n: dueSoon.length })}</h4>
                    <ul class="alert-list">
                        ${dueSoon.slice(0, 5).map(b => `
                            <li><span>${b.name} — ${Bills.formatDate(b.dueDate)}</span><strong>R$ ${parseFloat(b.amount).toFixed(2)}</strong></li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        if (pendingInstallments.length > 0) {
            html += `
                <div class="alert-card alert-info">
                    <h4>${t('alert_pending_installments', { n: pendingInstallments.length })}</h4>
                    <ul class="alert-list">
                        ${pendingInstallments.slice(0, 5).map(i => `
                            <li><span>${t('alert_installment', { n: i.number })} — ${Bills.formatDate(i.dueDate)}</span><strong>R$ ${parseFloat(i.amount).toFixed(2)}</strong></li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        container.innerHTML = html;
    },

    renderCharts(bills, payments) {
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#9ca3af' : '#6b7280';
        const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        this.renderCategoryChart(bills, textColor);
        this.renderMethodChart(payments, textColor, gridColor);
        this.renderTrendChart(bills, payments, textColor, gridColor);
        this.renderStatusChart(bills, textColor);
    },

    renderCategoryChart(bills, textColor) {
        const categoryTotals = {};
        bills.forEach(b => { const cat = b.category || 'other'; categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(b.amount); });
        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b', '#84cc16', '#a855f7'];

        const ctx = document.getElementById('chart-category');
        if (ctx && labels.length > 0) {
            this.charts.category = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels.map(l => t(`cat_${l}`)),
                    datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 2, borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff' }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: textColor, font: { family: 'Inter', size: 12 }, padding: 12 } } } }
            });
        }
    },

    renderMethodChart(payments, textColor, gridColor) {
        const methodTotals = {};
        payments.forEach(p => { const m = p.method || 'other'; methodTotals[m] = (methodTotals[m] || 0) + parseFloat(p.amount); });
        const labels = Object.keys(methodTotals);
        const data = Object.values(methodTotals);
        const colors = ['#10b981', '#6366f1', '#06b6d4', '#64748b', '#f59e0b', '#8b5cf6'];

        const ctx = document.getElementById('chart-method');
        if (ctx && labels.length > 0) {
            this.charts.method = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.map(l => t(`method_${l}`)),
                    datasets: [{ label: t('chart_amount'), data, backgroundColor: colors.slice(0, labels.length), borderRadius: 6, borderSkipped: false }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: textColor, font: { family: 'Inter' } }, grid: { display: false } },
                        y: { ticks: { color: textColor, font: { family: 'Inter' } }, grid: { color: gridColor } }
                    }
                }
            });
        }
    },

    renderTrendChart(bills, payments, textColor, gridColor) {
        const months = [];
        const now = new Date();
        const locale = i18n.getLocale();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
        }
        const billsByMonth = months.map(m => bills.filter(b => b.dueDate.startsWith(m)).reduce((sum, b) => sum + parseFloat(b.amount), 0));
        const paidByMonth = months.map(m => payments.filter(p => p.paymentDate.startsWith(m)).reduce((sum, p) => sum + parseFloat(p.amount), 0));
        const monthLabels = months.map(m => {
            const [y, mo] = m.split('-');
            return new Date(y, parseInt(mo)-1).toLocaleDateString(locale, { month: 'short', year: '2-digit' });
        });

        const ctx = document.getElementById('chart-trend');
        if (ctx) {
            this.charts.trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: monthLabels,
                    datasets: [
                        { label: t('chart_expected'), data: billsByMonth, borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#6366f1', pointRadius: 4 },
                        { label: t('chart_paid'), data: paidByMonth, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#10b981', pointRadius: 4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: textColor, font: { family: 'Inter' } } } },
                    scales: {
                        x: { ticks: { color: textColor, font: { family: 'Inter' } }, grid: { display: false } },
                        y: { ticks: { color: textColor, font: { family: 'Inter' } }, grid: { color: gridColor } }
                    }
                }
            });
        }
    },

    renderStatusChart(bills, textColor) {
        const paid = bills.filter(b => b.status === 'paid').length;
        const pending = bills.filter(b => b.status === 'pending').length;
        const overdue = bills.filter(b => b.status === 'overdue').length;
        const partial = bills.filter(b => b.status === 'partial').length;

        const ctx = document.getElementById('chart-status');
        if (ctx) {
            this.charts.status = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: [t('chart_label_paid'), t('chart_label_pending'), t('chart_label_overdue'), t('chart_label_partial')],
                    datasets: [{ data: [paid, pending, overdue, partial], backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#06b6d4'], borderWidth: 2, borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff' }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: textColor, font: { family: 'Inter', size: 12 }, padding: 12 } } } }
            });
        }
    },

    renderRecentPayments(payments, bills) {
        const billMap = {};
        bills.forEach(b => billMap[b.id] = b);
        const recent = payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 5);
        const container = document.getElementById('recent-payments');

        if (recent.length === 0) {
            container.innerHTML = `<div class="table-empty"><div class="empty-icon">💳</div><p>${t('no_recent_payments')}</p></div>`;
            return;
        }

        container.innerHTML = `
            <table>
                <thead><tr>
                    <th>${t('payment_col_bill')}</th>
                    <th>${t('bill_col_amount')}</th>
                    <th>${t('payment_col_date')}</th>
                    <th>${t('payment_col_method')}</th>
                </tr></thead>
                <tbody>
                    ${recent.map(p => {
                        const bill = billMap[p.billId];
                        return `<tr>
                            <td><strong>${bill ? bill.name : t('unknown')}</strong></td>
                            <td class="text-success"><strong>R$ ${parseFloat(p.amount).toFixed(2)}</strong></td>
                            <td>${Bills.formatDate(p.paymentDate)}</td>
                            <td>${Payments.getMethodBadge(p.method)}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;
    }
};
