// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjv9QcHnzt97VLnA2s5kbO6aXAggKawe4",
  authDomain: "paybuntu.firebaseapp.com",
  projectId: "paybuntu",
  storageBucket: "paybuntu.firebasestorage.app",
  messagingSenderId: "614158103762",
  appId: "1:614158103762:web:b05592517738bf5b8e290b",
};

// Initialize Firebase if not already
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// CONFIG: Change this to your actual admin email
const ADMIN_EMAIL = "paybuntu@gmail.com"; 

// State
let allUsers = [];
let allTransactions = [];
let allLogins = [];
let currentRange = '7d';

// Chart Instances
let txChart, balanceChart, usageChart, typeChart;

// Initialize Admin Logic
document.addEventListener("DOMContentLoaded", () => {
    checkAdminAuth();
    setupNavigation();
    setupFilters();
    setupConfigListeners();
    setupSupportHub();
});

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentRange = this.getAttribute('data-range');
            renderCharts();
        });
    });
}

function checkAdminAuth() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            console.warn("Access Denied: Logged in as " + user.email + ". Expected " + ADMIN_EMAIL);
            alert("Unauthorized access. Admin only.");
            window.location.href = "dashboard.html";
            return;
        }

        console.log("Admin authenticated successfully as: " + user.email);
        document.getElementById('adminEmail').textContent = user.email;
        loadAdminData();
    });
}

function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", function() {
            const targetId = this.getAttribute("data-target");
            
            // Switch Active Nav
            document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
            this.classList.add("active");

            // Switch Views
            document.querySelectorAll(".content-view").forEach(view => view.classList.add("hidden"));
            document.getElementById(targetId).classList.remove("hidden");
        });
    });

    document.getElementById('adminLogoutBtn').addEventListener("click", () => {
        auth.signOut().then(() => window.location.href = "login.html");
    });
}

async function loadAdminData() {
    try {
        // Fetch Users
        console.log("Fetching users...");
        const userSnapshot = await db.collection("users").get();
        allUsers = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderUsers(allUsers);

        // Fetch Transactions
        console.log("Fetching transactions...");
        const txSnapshot = await db.collection("transactions").get();
        allTransactions = txSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTransactions(allTransactions);

        // Fetch Logins
        console.log("Fetching logins...");
        const loginSnapshot = await db.collection("login_history").get();
        allLogins = loginSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Compute Stats
        updateStats();

        // Render Analytics
        console.log("Rendering charts...");
        renderCharts();

        // Load System Tools
        loadSystemConfig();

    } catch (err) {
        console.error("Admin Load Error:", err);
        const errorMsg = `Failed to load global data. 
Current User: ${auth.currentUser ? auth.currentUser.email : 'None'}
Error: ${err.message}

Ensure you have deployed the 'firestore.rules' file to your Firebase console.`;
        alert(errorMsg);
    }
}

function updateStats() {
    const totalBalance = allUsers.reduce((sum, u) => sum + (u.balance || 0), 0);
    const totalVolume = allTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

    document.getElementById('totalUsers').textContent = allUsers.length;
    document.getElementById('totalBalance').textContent = formatCurrency(totalBalance);
    document.getElementById('totalVolume').textContent = formatCurrency(totalVolume);
}

function renderUsers(users) {
    const table = document.getElementById('usersTableBody');
    table.innerHTML = users.map(user => `
        <tr>
            <td>${user.firstName || 'User'} ${user.lastName || ''}</td>
            <td>${user.email}</td>
            <td style="font-family: monospace;">${user.accountNumber || '---'}</td>
            <td style="font-weight: 600;">${formatCurrency(user.balance || 0)}</td>
            <td><span class="status-pill ${user.isBlocked ? 'blocked' : 'active'}">${user.isBlocked ? 'BLOCKED' : 'ACTIVE'}</span></td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="openUserActions('${user.id}')">Manage</button>
            </td>
        </tr>
    `).join('');
}

function renderTransactions(txs) {
    const table = document.getElementById('globalTxTableBody');
    // Sort by date descending
    txs.sort((a,b) => new Date(b.date) - new Date(a.date));

    table.innerHTML = txs.map(tx => `
        <tr>
            <td>${new Date(tx.date).toLocaleDateString()}</td>
            <td>${tx.description || 'Global TX'}</td>
            <td style="color: ${tx.amount > 0 ? 'var(--success)' : 'var(--danger)'}">
                ${formatCurrency(tx.amount)}
            </td>
            <td>${tx.type || 'Transfer'}</td>
            <td><span class="tx-status status-${tx.status}">${tx.status}</span></td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="viewGlobalReceipt('${tx.id}')">
                    <i class="fas fa-receipt"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Search Logic
document.getElementById('userSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u => 
        (u.firstName + ' ' + u.lastName).toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.accountNumber && u.accountNumber.includes(query))
    );
    renderUsers(filtered);
});

// Helper: Format Currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
    }).format(amount);
}

// User Actions (Placeholders)
function openUserActions(userId) {
    const user = allUsers.find(u => u.id === userId);
    if(!user) return;

    document.getElementById('userActionModal').classList.remove('hidden');
    document.getElementById('userModalDetails').innerHTML = `
        <div style="margin-bottom: 20px; text-align: left;">
            <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 4px;">User</div>
            <div style="font-size: 18px; font-weight: 600;">${user.firstName} ${user.lastName}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left; margin-bottom: 20px;">
            <div>
                <div style="font-size: 13px; color: var(--text-muted);">Account</div>
                <div style="font-family: monospace;">${user.accountNumber}</div>
            </div>
            <div>
                <div style="font-size: 13px; color: var(--text-muted);">Balance</div>
                <div style="font-weight: 700; color: var(--primary);">${formatCurrency(user.balance)}</div>
            </div>
        </div>
    `;

    const blockBtn = document.getElementById('blockUserBtn');
    blockBtn.textContent = user.isBlocked ? 'Unblock User' : 'Block User';
    blockBtn.className = user.isBlocked ? 'btn btn-success' : 'btn btn-danger';
    
    blockBtn.onclick = () => blockUser(userId, !user.isBlocked);
    document.getElementById('adjustBalanceBtn').onclick = () => promptAdjustBalance(userId);

    // Additional Information
    const extraDetails = document.createElement('div');
    extraDetails.innerHTML = `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); font-size: 13px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <div style="color: var(--text-muted);">Join Date</div>
                    <div>${user.createdAt ? new Date(user.createdAt.toDate ? user.createdAt.toDate() : user.createdAt).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                    <div style="color: var(--text-muted);">Phone Status</div>
                    <div style="color: ${user.phoneVerified ? 'var(--accent)' : 'var(--danger)'}">${user.phoneVerified ? 'VERIFIED' : 'UNVERIFIED'}</div>
                </div>
                <div>
                    <div style="color: var(--text-muted);">2FA Status</div>
                    <div>${user.twoFactorEnabled ? 'ENABLED' : 'DISABLED'}</div>
                </div>
                <div>
                    <div style="color: var(--text-muted);">Database UID</div>
                    <div style="font-family: monospace; font-size: 11px;">${user.id}</div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('userModalDetails').appendChild(extraDetails);
}

function closeUserModal() {
    document.getElementById('userActionModal').classList.add('hidden');
}

async function blockUser(userId, status) {
    if(!confirm(`Are you sure you want to ${status ? 'BLOCK' : 'UNBLOCK'} this user?`)) return;
    try {
        await db.collection("users").doc(userId).update({ isBlocked: status });
        alert(`User ${status ? 'blocked' : 'unblocked'} successfully.`);
        closeUserModal();
        loadAdminData();
    } catch(err) {
        alert("Action failed: " + err.message);
    }
}

async function promptAdjustBalance(userId) {
    const amount = prompt("Enter new balance for this user (NGN):");
    if(amount === null || isNaN(amount)) return;

    try {
        await db.collection("users").doc(userId).update({ balance: parseFloat(amount) });
        alert("Balance adjusted!");
        closeUserModal();
        loadAdminData();
    } catch(err) {
        alert("Action failed: " + err.message);
    }
}

// --- Analytics & Charting ---

function renderCharts() {
    try {
        renderTxVolumeChart();
        renderBalanceDistChart();
        renderUsageChart();
        renderTypeChart();
    } catch (e) {
        console.error("Chart Rendering Error:", e);
    }
}

function renderTxVolumeChart() {
    const canvas = document.getElementById('txVolumeChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const { labels, data } = aggregateDataByRange(allTransactions, (tx) => Math.abs(tx.amount || 0));

    if(txChart) txChart.destroy();
    txChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Transaction Volume (NGN)',
                data: data,
                borderColor: '#2edc5b',
                backgroundColor: 'rgba(46, 220, 91, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: (labels.length > 31 ? 0 : 4),
                pointBackgroundColor: '#2edc5b'
            }]
        },
        options: getChartOptions()
    });
}

function renderBalanceDistChart() {
    const canvas = document.getElementById('balanceDistChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Top 5 users + Others
    const sorted = [...allUsers].sort((a,b) => (b.balance || 0) - (a.balance || 0));
    const top = sorted.slice(0, 5);
    const others = sorted.slice(5).reduce((sum, u) => sum + (u.balance || 0), 0);
    
    const labels = top.map(u => u.firstName);
    const data = top.map(u => u.balance || 0);
    if(others > 0) {
        labels.push('Others');
        data.push(others);
    }

    if(balanceChart) balanceChart.destroy();
    balanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#2edc5b', '#3b82f6', '#fbbc05', '#ef4444', '#a855f7', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#a0a0a0', font: { size: 11 }, usePointStyle: true }
                }
            }
        }
    });
}

function renderUsageChart() {
    const canvas = document.getElementById('usageChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const { labels, data } = aggregateDataByRange(allLogins, () => 1, true);

    if(usageChart) usageChart.destroy();
    usageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Logins',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: '#3b82f6',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: getChartOptions()
    });
}

function aggregateDataByRange(sourceData, valueExtractor, isLogin = false) {
    const now = new Date();
    const dates = {};
    let count = 7;
    let unit = 'day';

    if (currentRange === '1m') count = 30;
    else if (currentRange === '1y') { count = 12; unit = 'month'; }
    else if (currentRange === '5y') { count = 60; unit = 'month'; }

    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now);
        let key = "";
        if (unit === 'day') {
            d.setDate(d.getDate() - i);
            key = d.toLocaleDateString();
        } else {
            d.setMonth(d.getMonth() - i);
            key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
        }
        dates[key] = 0;
    }

    sourceData.forEach(item => {
        let date;
        if (isLogin) {
            date = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp || Date.now());
        } else {
            date = new Date(item.date || Date.now());
        }

        let key = (unit === 'day') 
            ? date.toLocaleDateString() 
            : date.toLocaleString('default', { month: 'short', year: 'numeric' });

        if (dates[key] !== undefined) {
            dates[key] += valueExtractor(item);
        }
    });

    return {
        labels: Object.keys(dates),
        data: Object.values(dates)
    };
}

function renderTypeChart() {
    const canvas = document.getElementById('typeChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const types = {};
    allTransactions.forEach(tx => {
        const t = tx.type || 'Other';
        types[t] = (types[t] || 0) + 1;
    });

    if(typeChart) typeChart.destroy();
    typeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(types),
            datasets: [{
                data: Object.values(types),
                backgroundColor: ['#3b82f6', '#fbbc05', '#ef4444', '#2edc5b', '#a855f7'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#a0a0a0', font: { size: 10 }, usePointStyle: true }
                }
            }
        }
    });
}

function getChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#a0a0a0', font: { size: 10 } }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#a0a0a0', font: { size: 10 } }
            }
        }
    };
}

// --- System Tools & Configuration ---

function setupConfigListeners() {
    const saveBtn = document.getElementById("saveConfigBtn");
    if(saveBtn) {
        saveBtn.addEventListener("click", saveSystemConfig);
    }
}

async function loadSystemConfig() {
    try {
        const doc = await db.collection("metadata").doc("config").get();
        if(doc.exists) {
            const data = doc.data();
            document.getElementById("maintenanceToggle").checked = data.maintenanceMode || false;
            document.getElementById("transferFeePercent").value = data.transferFeePercent || 0;
            document.getElementById("minTransferFee").value = data.minTransferFee || 0;
            document.getElementById("broadcastMessage").value = data.broadcastMessage || "";
        }
    } catch(err) {
        console.error("Error loading system config:", err);
    }
}

async function saveSystemConfig() {
    const btn = document.getElementById("saveConfigBtn");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    const config = {
        maintenanceMode: document.getElementById("maintenanceToggle").checked,
        transferFeePercent: parseFloat(document.getElementById("transferFeePercent").value) || 0,
        minTransferFee: parseFloat(document.getElementById("minTransferFee").value) || 0,
        broadcastMessage: document.getElementById("broadcastMessage").value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.currentUser.email
    };

    try {
        await db.collection("metadata").doc("config").set(config, { merge: true });
        alert("System configuration updated successfully!");
    } catch(err) {
        console.error("Error saving config:", err);
        alert("Failed to save configuration: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- Support Hub Logic ---
let activeChats = [];
let selectedChatId = null;
let chatUnsubscribe = null;

function setupSupportHub() {
    const chatForm = document.getElementById('adminChatForm');
    if(chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendAdminReply();
        });
    }

    db.collection("support_chats").orderBy("lastUpdated", "desc").onSnapshot(snapshot => {
        activeChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderChatList();
        
        // Refresh selected chat if it was updated
        if(selectedChatId) {
            const updated = activeChats.find(c => c.id === selectedChatId);
            if(updated) renderAdminMessages(updated.messages);
        }
    });
}

function renderChatList() {
    const list = document.getElementById('activeChatList');
    if(!list) return;

    if(activeChats.length === 0) {
        list.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No active conversations</div>';
        return;
    }

    list.innerHTML = activeChats.map(chat => `
        <div class="chat-item ${selectedChatId === chat.id ? 'active' : ''} ${chat.hasUnread ? 'unread' : ''}" 
             onclick="selectChat('${chat.id}')">
            <div class="chat-item-info">
                <span class="email">${chat.userName || chat.userEmail || 'Anonymous'}</span>
                <span class="time">${chat.lastUpdated ? new Date(chat.lastUpdated.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
            </div>
            <div class="last-msg">${chat.lastMessage || '...'}</div>
        </div>
    `).join('');
}

async function selectChat(chatId) {
    selectedChatId = chatId;
    const chat = activeChats.find(c => c.id === chatId);
    if(!chat) return;

    // UI Updates
    document.getElementById('selectedChatHeader').innerHTML = `Chatting with: <strong>${chat.userEmail}</strong>`;
    document.getElementById('adminChatInput').disabled = false;
    document.getElementById('adminChatSendBtn').disabled = false;
    
    renderChatList(); // Refresh active state
    renderAdminMessages(chat.messages);

    // Mark as Read
    if(chat.hasUnread) {
        try {
            await db.collection("support_chats").doc(chatId).update({ hasUnread: false });
        } catch(err) { console.error("Mark read error:", err); }
    }
}

function renderAdminMessages(messages) {
    const chatBox = document.getElementById('adminChatMessages');
    if(!chatBox || !messages) return;

    chatBox.innerHTML = messages.map(msg => `
        <div class="chat-bubble ${msg.sender === 'admin' ? 'admin' : 'user'}">
            ${msg.text}
        </div>
    `).join('');
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendAdminReply() {
    const input = document.getElementById('adminChatInput');
    const text = input.value.trim();
    if(!text || !selectedChatId) return;

    input.value = "";
    
    try {
        const newMessage = {
            text: text,
            sender: 'admin',
            timestamp: new Date().toISOString()
        };

        await db.collection("support_chats").doc(selectedChatId).update({
            messages: firebase.firestore.FieldValue.arrayUnion(newMessage),
            lastMessage: text,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            hasUnread: false // Admin replied, so no new unread for admin
        });
    } catch(err) {
        alert("Reply failed: " + err.message);
    }
}

// --- Global Receipt Viewer ---
function viewGlobalReceipt(txId) {
    const tx = allTransactions.find(t => t.id === txId);
    if(!tx) return;

    // We can show a simple alert or reuse the receipt logic
    const details = `
        TRANSACTION RECEIPT
        -------------------
        Ref: ${tx.id}
        Date: ${new Date(tx.date).toLocaleString()}
        Amount: ${formatCurrency(Math.abs(tx.amount))}
        Status: ${tx.status.toUpperCase()}
        Description: ${tx.description}
        Type: ${tx.type}
        -------------------
        PAYBUNTU ADMIN AUDIT
    `;
    alert(details);
}
