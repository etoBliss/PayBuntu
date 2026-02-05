/**
 * Paybuntu Global Modal Service
 * Replaces native alert() and confirm() with premium custom modals.
 */

window.PaybuntuModal = {
    /**
     * Show a custom alert modal
     * @param {string} title 
     * @param {string} message 
     * @param {string} type - 'success', 'error', 'info', 'warning'
     */
    alert: function(title, message, type = 'info') {
        return new Promise((resolve) => {
            const modalHtml = `
                <div id="globalModal" class="modal-overlay">
                    <div class="modal-content custom-alert-modal fade-in">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                            <button class="close-modal" id="closeGlobalModal">&times;</button>
                        </div>
                        <div class="modal-body text-center" style="padding: 30px 20px;">
                            <div class="alert-icon-container ${type}">
                                ${this._getIcon(type)}
                            </div>
                            <p style="margin-top: 20px; font-size: 15px; color: var(--text-muted);">${message}</p>
                        </div>
                        <div class="modal-footer" style="padding: 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end;">
                            <button class="btn btn-primary" id="confirmGlobalModal">Okay</button>
                        </div>
                    </div>
                </div>
            `;
            this._injectAndShow(modalHtml, () => {
                resolve();
            });
        });
    },

    /**
     * Show a custom confirmation modal
     * @param {string} title 
     * @param {string} message 
     */
    confirm: function(title, message) {
        return new Promise((resolve) => {
            const modalHtml = `
                <div id="globalModal" class="modal-overlay">
                    <div class="modal-content custom-alert-modal fade-in">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                        </div>
                        <div class="modal-body text-center" style="padding: 30px 20px;">
                            <div class="alert-icon-container warning">
                                <i class="fas fa-question-circle"></i>
                            </div>
                            <p style="margin-top: 20px; font-size: 15px; color: var(--text-muted);">${message}</p>
                        </div>
                        <div class="modal-footer" style="padding: 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px;">
                            <button class="btn btn-secondary" id="cancelGlobalModal">Cancel</button>
                            <button class="btn btn-primary" id="confirmGlobalModal">Confirm</button>
                        </div>
                    </div>
                </div>
            `;
            this._injectAndShow(modalHtml, (confirmed) => {
                resolve(confirmed);
            }, true);
        });
    },

    /**
     * Show a custom prompt modal
     * @param {string} title 
     * @param {string} message 
     * @param {string} placeholder 
     * @param {string} inputType - 'text', 'number', 'password'
     */
    prompt: function(title, message, placeholder = '', inputType = 'text') {
        return new Promise((resolve) => {
            const modalHtml = `
                <div id="globalModal" class="modal-overlay">
                    <div class="modal-content custom-alert-modal fade-in">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                            <button class="close-modal" id="closeGlobalModal">&times;</button>
                        </div>
                        <div class="modal-body" style="padding: 30px 20px;">
                            <p style="margin-bottom: 20px; font-size: 15px; color: var(--text-muted); text-align: center;">${message}</p>
                            <div class="chat-footer" style="padding: 0; background: transparent; backdrop-filter: none; border: none;">
                                <input type="${inputType}" id="modalPromptInput" placeholder="${placeholder}" 
                                       style="width: 100%;" autocomplete="off">
                            </div>
                        </div>
                        <div class="modal-footer" style="padding: 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px;">
                            <button class="btn btn-secondary" id="cancelGlobalModal">Cancel</button>
                            <button class="btn btn-primary" id="confirmGlobalModal">Submit</button>
                        </div>
                    </div>
                </div>
            `;
            this._injectAndShow(modalHtml, (confirmed) => {
                if(confirmed) {
                    const val = document.getElementById('modalPromptInput').value;
                    resolve(val);
                } else {
                    resolve(null);
                }
            }, true);
        });
    },

    _getIcon: function(type) {
        switch(type) {
            case 'success': return '<i class="fas fa-check-circle"></i>';
            case 'error': return '<i class="fas fa-exclamation-circle" style="color: #ff4757;"></i>';
            case 'warning': return '<i class="fas fa-exclamation-triangle" style="color: #ffa502;"></i>';
            default: return '<i class="fas fa-info-circle" style="color: var(--primary);"></i>';
        }
    },

    _injectAndShow: function(html, callback, isConfirm = false) {
        // Remove existing global modal if any
        const existing = document.getElementById('globalModal');
        if(existing) existing.remove();

        const container = document.createElement('div');
        container.innerHTML = html;
        const modalElement = container.firstElementChild;
        document.body.appendChild(modalElement);

        const closeBtn = modalElement.querySelector('#closeGlobalModal');
        const confirmBtn = modalElement.querySelector('#confirmGlobalModal');
        const cancelBtn = modalElement.querySelector('#cancelGlobalModal');

        const cleanup = (result) => {
            modalElement.classList.remove('active');
            setTimeout(() => {
                modalElement.remove();
                callback(result);
            }, 300);
        };

        if(closeBtn) closeBtn.onclick = () => cleanup(false);
        if(confirmBtn) confirmBtn.onclick = () => cleanup(true);
        if(cancelBtn) cancelBtn.onclick = () => cleanup(false);

        // Standard modal behavior
        modalElement.onclick = (e) => {
            if(e.target === modalElement) cleanup(false);
        };

        // Add active class for animations if needed
        setTimeout(() => modalElement.classList.add('active'), 10);
    }
};

// Global overrides
// Note: We don't override native alert/confirm directly to avoid breaking things, 
// we use PaybuntuModal.alert() and PaybuntuModal.confirm() instead.
