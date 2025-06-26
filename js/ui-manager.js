// 用户界面管理模块
class UIManager {
    constructor() {
        this.currentModal = null;
        this.authManager = null;
        this.initPromise = this.init();
    }
    
    async init() {
        try {
            // 等待authManager初始化
            await this.waitForAuthManager();
            
            this.createAuthModal();
            this.createShopModal();
            this.createInventoryModal();
            this.createLeaderboardModal();
            this.createUserPanel();
            this.setupEventListeners();
            
            // 监听认证状态变化
            if (this.authManager) {
                this.authManager.addAuthChangeListener((isLoggedIn, user) => {
                    this.updateUserPanel(isLoggedIn, user);
                });
                
                // 监听积分变化
                this.authManager.addPointsChangeListener((points) => {
                    this.updatePointsDisplay(points);
                });
                
                // 初始化显示
                this.updateUserPanel(this.authManager.isLoggedIn, this.authManager.user);
            }
        } catch (error) {
            console.error('UIManager初始化失败:', error);
            // 即使authManager不可用，也要创建基本的UI
            this.createAuthModal();
            this.createUserPanel();
            this.setupEventListeners();
        }
    }
    
    async waitForAuthManager() {
        return new Promise((resolve) => {
            const checkAuthManager = () => {
                if (window.authManager) {
                    this.authManager = window.authManager;
                    resolve();
                } else {
                    setTimeout(checkAuthManager, 50);
                }
            };
            checkAuthManager();
        });
    }
    
    setupEventListeners() {
        // 点击模态框外部关闭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal();
            }
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.closeModal();
            }
        });
    }
    
    createUserPanel() {
        const userPanel = document.createElement('div');
        userPanel.id = 'userPanel';
        userPanel.className = 'user-panel';
        userPanel.innerHTML = `
            <div class="panel-toggle" id="panelToggle">
                <i class="fas fa-user"></i>
            </div>
            <div class="panel-content" id="panelContent">
                <div class="user-info">
                    <div class="user-details">
                        <div class="username">游客</div>
                        <div class="points">
                            <i class="fas fa-coins"></i>
                            <span class="points-value">0</span>
                        </div>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-primary" id="loginBtn">登录</button>
                    <button class="btn btn-secondary" id="registerBtn">注册</button>
                    <button class="btn btn-success" id="shopBtn" style="display: none;">
                        <i class="fas fa-store"></i> 商店
                    </button>
                    <button class="btn btn-info" id="inventoryBtn" style="display: none;">
                        <i class="fas fa-backpack"></i> 背包
                    </button>
                    <button class="btn btn-warning" id="leaderboardBtn">
                        <i class="fas fa-trophy"></i> 排行榜
                    </button>
                    <button class="btn btn-danger" id="logoutBtn" style="display: none;">
                        <i class="fas fa-sign-out-alt"></i> 登出
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(userPanel);
        
        // 绑定折叠事件
        document.getElementById('panelToggle').addEventListener('click', () => this.togglePanel());
        
        // 绑定其他事件
        document.getElementById('loginBtn').addEventListener('click', () => this.showAuthModal('login'));
        document.getElementById('registerBtn').addEventListener('click', () => this.showAuthModal('register'));
        document.getElementById('shopBtn').addEventListener('click', () => this.showShopModal());
        document.getElementById('inventoryBtn').addEventListener('click', () => this.showInventoryModal());
        document.getElementById('leaderboardBtn').addEventListener('click', () => this.showLeaderboardModal());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    }
    
    createAuthModal() {
        const modal = document.createElement('div');
        modal.id = 'authModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content auth-modal">
                <div class="modal-header">
                    <h2 id="authTitle">用户登录</h2>
                    <button class="close-btn" onclick="uiManager.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="authForm">
                        <div class="form-group">
                            <label for="username">用户名</label>
                            <input type="text" id="username" name="username" required>
                        </div>
                        <div class="form-group" id="emailGroup" style="display: none;">
                            <label for="email">邮箱</label>
                            <input type="email" id="email" name="email">
                        </div>
                        <div class="form-group">
                            <label for="password">密码</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary" id="authSubmitBtn">登录</button>
                            <button type="button" class="btn btn-secondary" id="authSwitchBtn">没有账号？注册</button>
                        </div>
                    </form>
                    <div id="authMessage" class="message"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定事件
        document.getElementById('authForm').addEventListener('submit', (e) => this.handleAuthSubmit(e));
        document.getElementById('authSwitchBtn').addEventListener('click', () => this.switchAuthMode());
    }
    
    createShopModal() {
        const modal = document.createElement('div');
        modal.id = 'shopModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content shop-modal">
                <div class="modal-header">
                    <h2>积分商店</h2>
                    <div class="user-points">
                        <i class="fas fa-coins"></i>
                        <span id="shopUserPoints">0</span>
                    </div>
                    <button class="close-btn" onclick="uiManager.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="shop-tabs">
                        <button class="tab-btn active" data-type="all">全部</button>
                        <button class="tab-btn" data-type="racket">球拍</button>
                        <button class="tab-btn" data-type="outfit">服装</button>
                        <button class="tab-btn" data-type="accessory">配饰</button>
                        <button class="tab-btn" data-type="consumable">道具</button>
                    </div>
                    <div id="shopItems" class="shop-items">
                        <div class="loading">加载中...</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定标签切换事件
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadShopItems(e.target.dataset.type === 'all' ? null : e.target.dataset.type);
            });
        });
    }
    
    createInventoryModal() {
        const modal = document.createElement('div');
        modal.id = 'inventoryModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content inventory-modal">
                <div class="modal-header">
                    <h2>我的背包</h2>
                    <button class="close-btn" onclick="uiManager.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="inventory-tabs">
                        <button class="tab-btn active" data-type="all">全部</button>
                        <button class="tab-btn" data-type="racket">球拍</button>
                        <button class="tab-btn" data-type="outfit">服装</button>
                        <button class="tab-btn" data-type="accessory">配饰</button>
                    </div>
                    <div id="inventoryItems" class="inventory-items">
                        <div class="loading">加载中...</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定标签切换事件
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadInventory(e.target.dataset.type === 'all' ? null : e.target.dataset.type);
            });
        });
    }
    
    createLeaderboardModal() {
        const modal = document.createElement('div');
        modal.id = 'leaderboardModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content leaderboard-modal">
                <div class="modal-header">
                    <h2>排行榜</h2>
                    <button class="close-btn" onclick="uiManager.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="leaderboardList" class="leaderboard-list">
                        <div class="loading">加载中...</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    showAuthModal(mode = 'login') {
        const modal = document.getElementById('authModal');
        const title = document.getElementById('authTitle');
        const emailGroup = document.getElementById('emailGroup');
        const submitBtn = document.getElementById('authSubmitBtn');
        const switchBtn = document.getElementById('authSwitchBtn');
        const form = document.getElementById('authForm');
        
        // 重置表单
        form.reset();
        document.getElementById('authMessage').textContent = '';
        
        if (mode === 'login') {
            title.textContent = '用户登录';
            emailGroup.style.display = 'none';
            submitBtn.textContent = '登录';
            switchBtn.textContent = '没有账号？注册';
            modal.dataset.mode = 'login';
        } else {
            title.textContent = '用户注册';
            emailGroup.style.display = 'block';
            document.getElementById('email').required = true;
            submitBtn.textContent = '注册';
            switchBtn.textContent = '已有账号？登录';
            modal.dataset.mode = 'register';
        }
        
        this.showModal(modal);
    }
    
    switchAuthMode() {
        const modal = document.getElementById('authModal');
        const currentMode = modal.dataset.mode;
        this.showAuthModal(currentMode === 'login' ? 'register' : 'login');
    }
    
    async handleAuthSubmit(e) {
        e.preventDefault();
        
        // 确保authManager已初始化
        if (!this.authManager) {
            await this.initPromise;
        }
        
        if (!this.authManager) {
            this.showMessage('认证系统未就绪，请稍后重试', 'error');
            return;
        }
        
        const modal = document.getElementById('authModal');
        const mode = modal.dataset.mode;
        const form = e.target;
        const formData = new FormData(form);
        const messageEl = document.getElementById('authMessage');
        const submitBtn = document.getElementById('authSubmitBtn');
        
        // 禁用提交按钮
        submitBtn.disabled = true;
        submitBtn.textContent = mode === 'login' ? '登录中...' : '注册中...';
        messageEl.textContent = '';
        
        try {
            let result;
            if (mode === 'login') {
                result = await this.authManager.login(
                    formData.get('username'),
                    formData.get('password')
                );
            } else {
                result = await this.authManager.register(
                    formData.get('username'),
                    formData.get('email'),
                    formData.get('password')
                );
            }
            
            if (result.success) {
                messageEl.textContent = result.message;
                messageEl.className = 'message success';
                setTimeout(() => {
                    this.closeModal();
                }, 1000);
            } else {
                messageEl.textContent = result.message;
                messageEl.className = 'message error';
            }
        } catch (error) {
            console.error('认证错误:', error);
            messageEl.textContent = '网络错误，请稍后重试';
            messageEl.className = 'message error';
        } finally {
            // 恢复提交按钮
            submitBtn.disabled = false;
            submitBtn.textContent = mode === 'login' ? '登录' : '注册';
        }
    }
    
    async showShopModal() {
        // 确保authManager已初始化
        if (!this.authManager) {
            await this.initPromise;
        }
        
        if (!this.authManager) {
            this.showMessage('认证系统未就绪，请稍后重试', 'error');
            return;
        }
        
        const modal = document.getElementById('shopModal');
        this.showModal(modal);
        
        // 更新用户积分显示
        const pointsEl = document.getElementById('shopUserPoints');
        pointsEl.textContent = this.authManager.user?.current_points || 0;
        
        // 加载商店物品
        this.loadShopItems();
    }
    
    async loadShopItems(itemType = null) {
        if (!this.authManager) {
            const container = document.getElementById('shopItems');
            container.innerHTML = '<div class="error">认证系统未就绪</div>';
            return;
        }
        
        const container = document.getElementById('shopItems');
        container.innerHTML = '<div class="loading">加载中...</div>';
        
        const result = await this.authManager.getShopItems(itemType);
        
        if (result.success) {
            if (result.items.length === 0) {
                container.innerHTML = '<div class="empty">暂无商品</div>';
                return;
            }
            
            container.innerHTML = result.items.map(item => `
                <div class="shop-item">
                    <div class="item-image">
                        <img src="${item.image_url}" alt="${item.name}" onerror="this.src='/images/placeholder.png'">
                    </div>
                    <div class="item-info">
                        <h3 class="item-name">${item.name}</h3>
                        <p class="item-description">${item.description}</p>
                        <div class="item-price">
                            <i class="fas fa-coins"></i>
                            ${item.price}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-primary" onclick="uiManager.purchaseItem(${item.id}, '${item.type}', '${item.name}', ${item.price})">
                            购买
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<div class="error">加载失败: ${result.message}</div>`;
        }
    }
    
    async purchaseItem(itemId, itemType, itemName, price) {
        if (!this.authManager) {
            this.showMessage('认证系统未就绪', 'error');
            return;
        }
        
        if (!this.authManager.isLoggedIn) {
            this.showMessage('请先登录', 'error');
            return;
        }
        
        if (this.authManager.user.current_points < price) {
            this.showMessage('积分不足', 'error');
            return;
        }
        
        if (!confirm(`确定要购买 ${itemName} 吗？需要 ${price} 积分。`)) {
            return;
        }
        
        const result = await this.authManager.purchaseItem(itemId, itemType);
        
        if (result.success) {
            this.showMessage(`成功购买 ${result.item_name}！`, 'success');
            // 更新积分显示
            document.getElementById('shopUserPoints').textContent = result.remaining_points;
            // 重新加载商店物品（可能需要更新购买状态）
            this.loadShopItems();
        } else {
            this.showMessage(result.message, 'error');
        }
    }
    
    async showInventoryModal() {
        // 确保authManager已初始化
        if (!this.authManager) {
            await this.initPromise;
        }
        
        if (!this.authManager) {
            this.showMessage('认证系统未就绪，请稍后重试', 'error');
            return;
        }
        
        const modal = document.getElementById('inventoryModal');
        this.showModal(modal);
        this.loadInventory();
    }
    
    async loadInventory(itemType = null) {
        if (!this.authManager) {
            const container = document.getElementById('inventoryItems');
            container.innerHTML = '<div class="error">认证系统未就绪</div>';
            return;
        }
        
        const container = document.getElementById('inventoryItems');
        container.innerHTML = '<div class="loading">加载中...</div>';
        
        const result = await this.authManager.getInventory();
        
        if (result.success) {
            let items = result.inventory;
            
            // 过滤物品类型
            if (itemType) {
                items = items.filter(item => item.item_type === itemType);
            }
            
            if (items.length === 0) {
                container.innerHTML = '<div class="empty">背包空空如也</div>';
                return;
            }
            
            container.innerHTML = items.map(item => `
                <div class="inventory-item ${item.is_equipped ? 'equipped' : ''}">
                    <div class="item-info">
                        <h3 class="item-name">${item.item_name}</h3>
                        <p class="item-type">${this.getItemTypeText(item.item_type)}</p>
                        ${item.is_equipped ? '<span class="equipped-badge">已装备</span>' : ''}
                    </div>
                    <div class="item-actions">
                        ${!item.is_equipped ? `
                            <button class="btn btn-primary" onclick="uiManager.equipItem(${item.item_id}, '${item.item_type}', '${item.item_name}')">
                                装备
                            </button>
                        ` : '<span class="equipped-text">使用中</span>'}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<div class="error">加载失败: ${result.message}</div>`;
        }
    }
    
    async equipItem(itemId, itemType, itemName) {
        if (!this.authManager) {
            this.showMessage('认证系统未就绪', 'error');
            return;
        }
        
        const result = await this.authManager.equipItem(itemId, itemType);
        
        if (result.success) {
            this.showMessage(`已装备 ${itemName}`, 'success');
            // 重新加载背包
            this.loadInventory();
        } else {
            this.showMessage(result.message, 'error');
        }
    }
    
    async showLeaderboardModal() {
        // 确保authManager已初始化
        if (!this.authManager) {
            await this.initPromise;
        }
        
        if (!this.authManager) {
            this.showMessage('认证系统未就绪，请稍后重试', 'error');
            return;
        }
        
        const modal = document.getElementById('leaderboardModal');
        this.showModal(modal);
        
        const container = document.getElementById('leaderboardList');
        container.innerHTML = '<div class="loading">加载中...</div>';
        
        const result = await this.authManager.getLeaderboard();
        
        if (result.success) {
            if (result.leaderboard.length === 0) {
                container.innerHTML = '<div class="empty">暂无排行数据</div>';
                return;
            }
            
            container.innerHTML = `
                <div class="leaderboard-header">
                    <div class="rank">排名</div>
                    <div class="username">用户名</div>
                    <div class="points">总积分</div>
                    <div class="games">游戏场次</div>
                    <div class="winrate">胜率</div>
                </div>
                ${result.leaderboard.map(user => `
                    <div class="leaderboard-item ${user.username === this.authManager.user?.username ? 'current-user' : ''}">
                        <div class="rank">
                            ${user.rank <= 3 ? `<i class="fas fa-trophy rank-${user.rank}"></i>` : user.rank}
                        </div>
                        <div class="username">${user.username}</div>
                        <div class="points">${user.total_points}</div>
                        <div class="games">${user.games_played}</div>
                        <div class="winrate">${user.win_rate}%</div>
                    </div>
                `).join('')}
            `;
        } else {
            container.innerHTML = `<div class="error">加载失败: ${result.message}</div>`;
        }
    }
    
    getItemTypeText(type) {
        const typeMap = {
            'racket': '球拍',
            'outfit': '服装',
            'accessory': '配饰',
            'consumable': '道具'
        };
        return typeMap[type] || type;
    }
    
    updateUserPanel(isLoggedIn, user) {
        const userPanel = document.getElementById('userPanel');
        if (!userPanel) return;
        
        const username = userPanel.querySelector('.username');
        const pointsValue = userPanel.querySelector('.points-value');
        const userActions = userPanel.querySelector('.user-actions');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const shopBtn = document.getElementById('shopBtn');
        const inventoryBtn = document.getElementById('inventoryBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (isLoggedIn && user) {
            username.textContent = user.username;
            pointsValue.textContent = user.points || 0;
            
            // 更新CSS类
            userActions.className = 'user-actions logged-in';
            
            // 显示登录后的按钮
            loginBtn.style.display = 'none';
            registerBtn.style.display = 'none';
            shopBtn.style.display = 'flex';
            inventoryBtn.style.display = 'flex';
            logoutBtn.style.display = 'flex';
        } else {
            username.textContent = '游客';
            pointsValue.textContent = '0';
            
            // 更新CSS类
            userActions.className = 'user-actions logged-out';
            
            // 显示未登录的按钮
            loginBtn.style.display = 'flex';
            registerBtn.style.display = 'flex';
            shopBtn.style.display = 'none';
            inventoryBtn.style.display = 'none';
            logoutBtn.style.display = 'none';
        }
    }
    
    updatePointsDisplay(points) {
        const pointsElements = document.querySelectorAll('.points-value, #shopUserPoints');
        pointsElements.forEach(el => {
            el.textContent = points;
        });
    }
    
    togglePanel() {
        const userPanel = document.getElementById('userPanel');
        const panelContent = document.getElementById('panelContent');
        const panelToggle = document.getElementById('panelToggle');
        
        if (userPanel.classList.contains('collapsed')) {
            userPanel.classList.remove('collapsed');
            panelContent.style.display = 'block';
            panelToggle.innerHTML = '<i class="fas fa-user"></i>';
        } else {
            userPanel.classList.add('collapsed');
            panelContent.style.display = 'none';
            panelToggle.innerHTML = '<i class="fas fa-chevron-left"></i>';
        }
    }
    
    logout() {
        if (!this.authManager) {
            this.showMessage('认证系统未就绪', 'error');
            return;
        }
        
        if (confirm('确定要登出吗？')) {
            this.authManager.logout();
            this.showMessage('已成功登出', 'success');
        }
    }
    
    showModal(modal) {
        if (this.currentModal) {
            this.currentModal.style.display = 'none';
        }
        modal.style.display = 'flex';
        this.currentModal = modal;
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        if (this.currentModal) {
            this.currentModal.style.display = 'none';
            this.currentModal = null;
            document.body.style.overflow = 'auto';
        }
    }
    
    showMessage(message, type = 'info') {
        // 创建消息提示
        const messageEl = document.createElement('div');
        messageEl.className = `toast toast-${type}`;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        // 显示动画
        setTimeout(() => messageEl.classList.add('show'), 100);
        
        // 自动隐藏
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}