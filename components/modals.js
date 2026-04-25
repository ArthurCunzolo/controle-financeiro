/**
 * modals.js — Modal System
 * 
 * Generic modal open/close and confirmation dialogs.
 */

const Modal = {
    _escHandlers: new Map(),

    /** Open a modal by ID */
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Remove previous listeners to prevent memory leak
        if (this._escHandlers.has(modalId)) {
            document.removeEventListener('keydown', this._escHandlers.get(modalId));
        }

        // Close on overlay click
        modal.onclick = (e) => {
            if (e.target === modal) this.close(modalId);
        };

        // Close on Escape key
        const escHandler = (e) => {
            if (e.key === 'Escape') this.close(modalId);
        };
        this._escHandlers.set(modalId, escHandler);
        document.addEventListener('keydown', escHandler);
    },

    /** Close a modal by ID */
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('active');
        document.body.style.overflow = '';

        // Clean up escape handler
        if (this._escHandlers.has(modalId)) {
            document.removeEventListener('keydown', this._escHandlers.get(modalId));
            this._escHandlers.delete(modalId);
        }
        modal.onclick = null;
    },

    /** Show a confirmation dialog — returns a Promise<boolean> */
    confirm(title, message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `
                <div class="modal-content" style="max-width: 420px;">
                    <div class="modal-header">
                        <h3>⚠️ ${title}</h3>
                    </div>
                    <div class="modal-body">
                        <p style="color: var(--text-secondary); font-size: 14px;">${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" id="confirm-cancel">${typeof t === 'function' ? t('cancel') : 'Cancel'}</button>
                        <button class="btn btn-danger" id="confirm-ok">${typeof t === 'function' ? t('yes') : 'Confirm'}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const cleanup = (result) => {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
                resolve(result);
            };

            overlay.querySelector('#confirm-cancel').addEventListener('click', () => cleanup(false));
            overlay.querySelector('#confirm-ok').addEventListener('click', () => cleanup(true));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup(false);
            });

            const escHandler = (e) => {
                if (e.key === 'Escape') cleanup(false);
            };
            document.addEventListener('keydown', escHandler);
        });
    }
};
