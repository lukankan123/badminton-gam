// 用户认证和积分管理模块
class AuthManager {
    constructor() {
        this.baseURL = this.getBaseURL();
        this.token = localStorage.getItem('auth_token');
        this.user = JSON.parse(localStorage.getItem('user_data') || 'null');
        this.isLoggedIn = !!this.token;
        
        // 事件监听器
        this.onAuthChange = [];
        this.onPointsChange = [];
    }
    
    getBaseURL() {
        // 根据环境自动检测API地址
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8001';
        } else {
            // Vercel部署后的API地址
            return window.location.origin;
        }
    }
    
    // 添加认证状态变化监听器
    addAuthChangeListener(callback) {
        this.onAuthChange.push(callback);
    }
    
    // 添加积分变化监听器
    addPointsChangeListener(callback) {
        this.onPointsChange.push(callback);
    }
    
    // 触发认证状态变化事件
    triggerAuthChange() {
        this.onAuthChange.forEach(callback => callback(this.isLoggedIn, this.user));
    }
    
    // 触发积分变化事件
    triggerPointsChange() {
        this.onPointsChange.forEach(callback => callback(this.user?.current_points || 0));
    }
    
    // 设置认证信息
    setAuth(token, userData) {
        this.token = token;
        this.user = userData;
        this.isLoggedIn = true;
        
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        
        this.triggerAuthChange();
        this.triggerPointsChange();
    }
    
    // 清除认证信息
    clearAuth() {
        this.token = null;
        this.user = null;
        this.isLoggedIn = false;
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        
        this.triggerAuthChange();
        this.triggerPointsChange();
    }
    
    // 获取请求头
    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        };
    }
    
    // 用户注册
    async register(username, email, password) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '注册失败');
            }
            
            this.setAuth(data.token, data.user);
            return { success: true, message: data.message, user: data.user };
        } catch (error) {
            console.error('注册错误:', error);
            return { success: false, message: error.message };
        }
    }
    
    // 用户登录
    async login(username, password) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '登录失败');
            }
            
            this.setAuth(data.token, data.user);
            return { success: true, message: data.message, user: data.user };
        } catch (error) {
            console.error('登录错误:', error);
            return { success: false, message: error.message };
        }
    }
    
    // 用户登出
    logout() {
        this.clearAuth();
        return { success: true, message: '已成功登出' };
    }
    
    // 获取用户资料
    async getProfile() {
        if (!this.isLoggedIn) {
            return { success: false, message: '请先登录' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/auth/profile`, {
                headers: this.getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.clearAuth();
                }
                throw new Error(data.detail || '获取用户信息失败');
            }
            
            this.user = data.user;
            localStorage.setItem('user_data', JSON.stringify(data.user));
            this.triggerPointsChange();
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('获取用户资料错误:', error);
            return { success: false, message: error.message };
        }
    }
    
    // 获取积分余额
    async getPointsBalance() {
        if (!this.isLoggedIn) {
            return { success: false, message: '请先登录' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/points/balance`, {
                headers: this.getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '获取积分失败');
            }
            
            return { success: true, ...data };
        } catch (error) {
            console.error('获取积分余额错误:', error);
            return { success: false, message: error.message };
        }
    }
    
    // 记录游戏结果并获得积分
    async earnPoints(gameRecord) {
        if (!this.isLoggedIn) {
            return { success: false, message: '请先登录以保存游戏记录' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/points/earn`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(gameRecord)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '记录积分失败');
            }
            
            // 更新本地用户数据
            if (this.user) {
                this.user.current_points = data.current_points;
                this.user.total_points = data.total_points;
                localStorage.setItem('user_data', JSON.stringify(this.user));
                this.triggerPointsChange();
            }
            
            return { success: true, ...data };
        } catch (error) {
            console.error('记录积分错误:', error);
            return { success: false, message: error.message };
        }
    }
    
    // 获取积分历史
    async getPointsHistory(limit = 20) {
        if (!this.isLoggedIn) {
            return { success: false, message: '请先登录' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/points/history?limit=${limit}`, {
                headers: this.getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '获取积分历史失败');
            }
            
            return { success: true, records: data.records };
        } catch (error) {
            console.error('获取积分历史错误:', error);
            return { success: false, message: error.message };
        }
    }
    
    // 获取排行榜
    async getLeaderboard(limit = 10) {
        try {
            const response = await fetch(`${this.baseURL}/api/points/leaderboard?limit=${limit}`);
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '获取排行榜失败');
            }
            
            return { success: true, leaderboard: data.leaderboard };
        } catch (error) {
            console.error('获取排行榜错误:', error);
            return { success: false, message: error.message };
        }
    }
    
    // 获取商店物品
    async getShopItems(itemType = null) {
        try {
            const url = itemType 
                ? `${this.baseURL}/api/shop/items?item_type=${itemType}`
                : `${this.baseURL}/api/shop/items`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '获取商店物品失败');
            }
            
            return { success: true, items: data.items };
        } catch (error) {
            console.error('获取商店物品错误:', error);
            return { success: false, message: error.message };
        }
    }
    
    // 购买物品
    async purchaseItem(itemId, itemType) {
        if (!this.isLoggedIn) {
            return { success: false, message: '请先登录' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/shop/purchase`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ item_id: itemId, item_type: itemType })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '购买失败');
            }
            
            // 更新本地积分
            if (this.user) {
                this.user.current_points = data.remaining_points;
                localStorage.setItem('user_data', JSON.stringify(this.user));
                this.triggerPointsChange();
            }
            
            return { success: true, ...data };
        } catch (error) {
            console.error('购买物品错误:', error);
            return { success: false, message: error.message };
        }
    }
    
    // 获取用户背包
    async getInventory() {
        if (!this.isLoggedIn) {
            return { success: false, message: '请先登录' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/shop/inventory`, {
                headers: this.getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '获取背包失败');
            }
            
            return { success: true, inventory: data.inventory };
        } catch (error) {
            console.error('获取背包错误:', error);
            return { success: false, message: error.message };
        }
    }
    
    // 装备物品
    async equipItem(itemId, itemType) {
        if (!this.isLoggedIn) {
            return { success: false, message: '请先登录' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/shop/equip`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ item_id: itemId, item_type: itemType })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '装备失败');
            }
            
            return { success: true, message: data.message };
        } catch (error) {
            console.error('装备物品错误:', error);
            return { success: false, message: error.message };
        }
    }
    
    // 获取游戏统计
    async getGameStats() {
        if (!this.isLoggedIn) {
            return { success: false, message: '请先登录' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/game/stats`, {
                headers: this.getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '获取游戏统计失败');
            }
            
            return { success: true, ...data };
        } catch (error) {
            console.error('获取游戏统计错误:', error);
            return { success: false, message: error.message };
        }
    }
    
    // 计算游戏积分
    calculateGamePoints(result, playerScore, aiScore, setsWon, setsLost, duration) {
        let basePoints = 0;
        
        // 基础积分
        if (result === 'win') {
            basePoints = 100;
            // 胜利奖励
            basePoints += setsWon * 50;
            // 完胜奖励
            if (setsLost === 0) {
                basePoints += 100;
            }
        } else if (result === 'lose') {
            basePoints = 20;
            // 参与奖励
            basePoints += setsWon * 25;
        }
        
        // 分数奖励
        basePoints += playerScore * 2;
        
        // 时长奖励（鼓励长时间游戏）
        if (duration > 300) { // 5分钟以上
            basePoints += 20;
        }
        if (duration > 600) { // 10分钟以上
            basePoints += 30;
        }
        
        return Math.max(basePoints, 10); // 最少10积分
    }
}

// 创建全局认证管理器实例
window.authManager = new AuthManager();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}