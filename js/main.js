// 火柴人羽毛球游戏
class StickmanBadmintonGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // 游戏状态
        this.gameState = 'ready'; // ready, playing, paused, gameOver
        
        // 游戏对象
        this.ball = {
            x: 400,
            y: 300,
            radius: 8,
            vx: 0,
            vy: 0,
            gravity: 0.3,
            bounce: 0.8,
            trail: []
        };
        
        // 玩家火柴人
        this.player = {
            x: 150,
            y: 450,
            width: 40,
            height: 80,
            vx: 0,
            vy: 0,
            onGround: true,
            jumpPower: -12,
            speed: 5,
            armAngle: 0,
            isSwinging: false,
            swingTimer: 0
        };
        
        // AI火柴人
        this.ai = {
            x: 650,
            y: 450,
            width: 40,
            height: 80,
            vx: 0,
            vy: 0,
            onGround: true,
            jumpPower: -10,
            speed: 3,
            armAngle: 0,
            isSwinging: false,
            swingTimer: 0,
            reactionTime: 0
        };
        
        // 分数
        this.score = {
            player: 0,
            ai: 0
        };
        
        // 三局两胜制
        this.match = {
            playerSets: 0,    // 玩家赢得的局数
            aiSets: 0,        // AI赢得的局数
            currentSet: 1,    // 当前局数
            totalSets: 3,     // 总局数
            setsToWin: 2      // 获胜所需局数
        };
        
        // 游戏设置
        this.settings = {
            difficulty: 'medium',
            soundEnabled: true,
            targetScore: 11
        };
        
        // 输入状态
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            clicked: false
        };
        
        // 特效
        this.particles = [];
        this.effects = [];
        
        // 网子
        this.net = {
            x: 400,
            y: 400,
            width: 4,
            height: 150
        };
        
        this.init();
    }
    
    init() {
        // 隐藏加载界面
        this.loadingOverlay.style.display = 'none';
        
        // 初始化事件监听器
        this.setupEventListeners();
        
        // 开始游戏循环
        this.gameLoop();
        
        console.log('火柴人羽毛球游戏准备就绪!');
    }
    
    setupEventListeners() {
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.playerJump();
                } else if (this.gameState === 'ready') {
                    this.startGame();
                }
            }
            
            // 击球按键 (W键或上箭头键)
            if (e.code === 'KeyW' || e.code === 'ArrowUp') {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.playerSwing();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // 鼠标事件
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'ready') {
                this.startGame();
            }
        });
        
        // 按钮事件
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetGame();
        });
        
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.settings.difficulty = e.target.value;
            this.updateAIDifficulty();
        });
        
        document.getElementById('soundToggle').addEventListener('change', (e) => {
            this.settings.soundEnabled = e.target.checked;
        });
        
        // 模态框事件
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.hideModal();
            this.resetGame();
            this.startGame();
        });
        
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.hideModal();
        });
    }
    
    startGame() {
        if (this.gameState === 'ready' || this.gameState === 'gameOver') {
            this.gameState = 'playing';
            this.serveBall();
            this.updateUI();
        }
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
        }
        this.updateUI();
    }
    
    resetGame() {
        this.score.player = 0;
        this.score.ai = 0;
        this.match.playerSets = 0;
        this.match.aiSets = 0;
        this.match.currentSet = 1;
        this.setupGame();
        this.gameState = 'ready';
        this.updateUI();
    }
    
    setupGame() {
        // 重置球的位置
        this.ball.x = 400;
        this.ball.y = 300;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.trail = [];
        
        // 重置玩家位置
        this.player.x = 150;
        this.player.y = 450;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.onGround = true;
        this.player.isSwinging = false;
        
        // 重置AI位置
        this.ai.x = 650;
        this.ai.y = 450;
        this.ai.vx = 0;
        this.ai.vy = 0;
        this.ai.onGround = true;
        this.ai.isSwinging = false;
        
        // 清空特效
        this.particles = [];
        this.effects = [];
    }
    
    serveBall() {
        // 随机发球方向
        const direction = Math.random() > 0.5 ? 1 : -1;
        this.ball.x = 400;
        this.ball.y = 200;
        this.ball.vx = direction * (2 + Math.random() * 3);
        this.ball.vy = 2 + Math.random() * 2;
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        if (this.gameState !== 'playing' && this.gameState !== 'scoring') return;
        
        this.updatePlayer();
        this.updateAI();
        
        // 在得分状态下不更新球的物理
        if (this.gameState === 'playing') {
            this.updateBall();
            this.checkCollisions();
            this.checkScoring();
        }
        
        this.updateParticles();
        this.updateEffects();
    }
    
    updatePlayer() {
        // 左右移动
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.player.vx = -this.player.speed;
        } else if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.player.vx = this.player.speed;
        } else {
            this.player.vx *= 0.8; // 摩擦力
        }
        
        // 重力
        if (!this.player.onGround) {
            this.player.vy += 0.5;
        }
        
        // 更新位置
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        
        // 边界检测
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x > 380) this.player.x = 380; // 不能越过网子
        
        // 地面检测
        if (this.player.y >= 450) {
            this.player.y = 450;
            this.player.vy = 0;
            this.player.onGround = true;
        }
        
        // 挥拍动画
        if (this.player.isSwinging) {
            this.player.swingTimer++;
            this.player.armAngle = Math.sin(this.player.swingTimer * 0.5) * 90;
            if (this.player.swingTimer > 20) {
                this.player.isSwinging = false;
                this.player.swingTimer = 0;
                this.player.armAngle = 0;
            }
        }
    }
    
    updateAI() {
        // 初始化AI学习数据和情绪系统
        if (!this.ai.learningData) {
            this.ai.learningData = {
                playerHitPatterns: [],
                successfulStrategies: [],
                failedStrategies: [],
                adaptiveCounter: 0,
                recentResults: [], // 最近的得分结果
                confidence: 0.5, // AI信心值 (0-1)
                momentum: 0 // 连击动量 (-5 到 5)
            };
        }
        
        // 更新AI情绪状态
        this.updateAIMood();
        
        // 根据难度调整AI参数
        let baseParams = {
            reactionDelay: 0,
            predictionAccuracy: 1,
            moveSpeed: this.ai.speed,
            strategicThinking: 0
        };
        
        switch (this.settings.difficulty) {
            case 'easy':
                baseParams.reactionDelay = 15;
                baseParams.predictionAccuracy = 0.7;
                baseParams.moveSpeed *= 0.8;
                baseParams.strategicThinking = 0.3;
                break;
            case 'medium':
                baseParams.reactionDelay = 8;
                baseParams.predictionAccuracy = 0.85;
                baseParams.moveSpeed *= 0.9;
                baseParams.strategicThinking = 0.6;
                break;
            case 'hard':
                baseParams.reactionDelay = 3;
                baseParams.predictionAccuracy = 0.95;
                baseParams.moveSpeed *= 1.1;
                baseParams.strategicThinking = 0.9;
                break;
        }
        
        // 应用情绪修正
        const adjustedParams = this.applyMoodModifiers(baseParams);
        const { reactionDelay, predictionAccuracy, moveSpeed, strategicThinking } = adjustedParams;
        
        // AI反应延迟
        if (this.ai.reactionTime > 0) {
            this.ai.reactionTime--;
            return;
        }
        
        // 高级球路预测算法（考虑情绪影响）
        const prediction = this.advancedBallPrediction(predictionAccuracy);
        
        // 分析玩家行为模式
        this.analyzePlayerBehavior();
        
        // 动态战术选择
        const currentTactic = this.selectAITactic(strategicThinking);
        
        if (this.ball.x > 400 || (this.ball.vx > 0 && this.ball.x > 300)) {
            // 球在AI一侧或向AI一侧移动
            this.executeOffensiveStrategy(prediction, currentTactic, moveSpeed);
        } else {
            // 球在玩家一侧，执行防守策略
            this.executeDefensiveStrategy(currentTactic, moveSpeed);
        }
        
        // 重力
        if (!this.ai.onGround) {
            this.ai.vy += 0.5;
        }
        
        // 更新位置
        this.ai.x += this.ai.vx;
        this.ai.y += this.ai.vy;
        
        // 边界检测
        if (this.ai.x < 420) this.ai.x = 420; // 不能越过网子
        if (this.ai.x > 760) this.ai.x = 760;
        
        // 地面检测
        if (this.ai.y >= 450) {
            this.ai.y = 450;
            this.ai.vy = 0;
            this.ai.onGround = true;
        }
        
        // 挥拍动画
        if (this.ai.isSwinging) {
            this.ai.swingTimer++;
            this.ai.armAngle = Math.sin(this.ai.swingTimer * 0.5) * -90;
            if (this.ai.swingTimer > 20) {
                this.ai.isSwinging = false;
                this.ai.swingTimer = 0;
                this.ai.armAngle = 0;
            }
        }
    }
    
    // 高级球路预测算法
    advancedBallPrediction(accuracy) {
        let predictedX = this.ball.x;
        let predictedY = this.ball.y;
        let tempVx = this.ball.vx;
        let tempVy = this.ball.vy;
        let timeToReach = 0;
        let maxHeight = this.ball.y;
        
        // 考虑空气阻力和旋转的高级物理预测
        for (let i = 0; i < 60; i++) {
            predictedX += tempVx;
            predictedY += tempVy;
            tempVy += 0.3; // 重力
            tempVx *= 0.998; // 空气阻力
            timeToReach++;
            
            if (predictedY < maxHeight) maxHeight = predictedY;
            
            // 预测球的落点
            if (predictedY > 580) break;
            if (predictedX > 400 && predictedX < 800 && tempVy > 0) break;
        }
        
        // 根据精度添加预测误差
        const errorRange = 40 * (1 - accuracy);
        predictedX += (Math.random() - 0.5) * errorRange;
        
        return {
            x: predictedX,
            y: predictedY,
            timeToReach: timeToReach,
            maxHeight: maxHeight,
            confidence: accuracy
        };
    }
    
    // 分析玩家行为模式
    analyzePlayerBehavior() {
        const playerX = this.player.x;
        const ballX = this.ball.x;
        
        // 记录玩家击球模式
        if (this.player.isSwinging && !this.ai.lastPlayerSwing) {
            this.ai.learningData.playerHitPatterns.push({
                playerPos: playerX,
                ballPos: ballX,
                timestamp: Date.now()
            });
            
            // 保持最近20次击球记录
            if (this.ai.learningData.playerHitPatterns.length > 20) {
                this.ai.learningData.playerHitPatterns.shift();
            }
        }
        this.ai.lastPlayerSwing = this.player.isSwinging;
        
        // 分析玩家偏好
        if (this.ai.learningData.playerHitPatterns.length > 5) {
            const recentPatterns = this.ai.learningData.playerHitPatterns.slice(-5);
            const avgPlayerPos = recentPatterns.reduce((sum, p) => sum + p.playerPos, 0) / recentPatterns.length;
            
            this.ai.playerTendency = {
                favoritePosition: avgPlayerPos,
                isAggressive: recentPatterns.some(p => Math.abs(p.ballPos - p.playerPos) > 100)
            };
        }
    }
    
    // 动态战术选择
    selectAITactic(strategicLevel) {
        const tactics = ['aggressive', 'defensive', 'adaptive', 'counter'];
        
        if (strategicLevel < 0.4) {
            return Math.random() > 0.6 ? 'aggressive' : 'defensive';
        }
        
        // 根据学习到的策略成功率调整
        let preferredTactic = this.getPreferredTacticFromLearning();
        
        // 根据比分选择战术
        const scoreDiff = this.score.ai - this.score.player;
        const totalScore = this.score.ai + this.score.player;
        
        // 游戏后期更加谨慎
        const gamePhase = totalScore / (this.settings.targetScore * 2);
        
        if (scoreDiff > 2 && gamePhase > 0.7) {
            return 'defensive'; // 领先且接近胜利时保守
        } else if (scoreDiff < -2) {
            return preferredTactic === 'defensive' ? 'aggressive' : preferredTactic; // 落后时避免过于保守
        } else if (this.ai.playerTendency && this.ai.playerTendency.isAggressive) {
            return 'counter'; // 反击玩家的激进打法
        } else if (preferredTactic && Math.random() < 0.7) {
            return preferredTactic; // 70%概率使用学习到的偏好战术
        } else {
            return this.selectContextualTactic(scoreDiff, gamePhase);
        }
    }
    
    // 从学习数据中获取偏好战术
    getPreferredTacticFromLearning() {
        if (!this.ai.tacticPreference) return null;
        
        let bestTactic = null;
        let bestSuccessRate = 0;
        
        Object.keys(this.ai.tacticPreference).forEach(tactic => {
            const data = this.ai.tacticPreference[tactic];
            if (data.total >= 3) { // 至少有3次数据
                const successRate = data.success / data.total;
                if (successRate > bestSuccessRate) {
                    bestSuccessRate = successRate;
                    bestTactic = tactic;
                }
            }
        });
        
        return bestSuccessRate > 0.6 ? bestTactic : null;
    }
    
    // 根据上下文选择战术
    selectContextualTactic(scoreDiff, gamePhase) {
        // 根据游戏阶段和比分差异选择战术
        if (gamePhase < 0.3) {
            // 游戏早期，更多尝试
            return ['aggressive', 'adaptive'][Math.floor(Math.random() * 2)];
        } else if (gamePhase > 0.8) {
            // 游戏后期，更加谨慎
            return scoreDiff >= 0 ? 'defensive' : 'aggressive';
        } else {
            // 游戏中期，平衡策略
            if (Math.abs(scoreDiff) <= 1) {
                return 'adaptive';
            } else {
                return scoreDiff > 0 ? 'defensive' : 'counter';
            }
        }
    }
    
    // 执行进攻策略
    executeOffensiveStrategy(prediction, tactic, moveSpeed) {
        let targetX = prediction.x;
        
        // 根据战术调整目标位置
        switch (tactic) {
            case 'aggressive':
                targetX = prediction.x - 15; // 更靠近球
                break;
            case 'defensive':
                targetX = prediction.x + 10; // 稍微保守
                break;
            case 'adaptive':
                targetX = prediction.x - 5; // 平衡位置
                break;
            case 'counter':
                // 预判玩家下一步动作
                if (this.ai.playerTendency) {
                    targetX = 800 - this.ai.playerTendency.favoritePosition;
                }
                break;
        }
        
        targetX = Math.max(420, Math.min(760, targetX));
        
        // 智能移动策略
        const distanceToTarget = Math.abs(this.ai.x - targetX);
        if (distanceToTarget > 8) {
            const urgency = Math.min(1, prediction.timeToReach / 30);
            const adjustedSpeed = moveSpeed * (0.7 + urgency * 0.5);
            
            if (this.ai.x < targetX) {
                this.ai.vx = adjustedSpeed;
            } else {
                this.ai.vx = -adjustedSpeed;
            }
        } else {
            this.ai.vx *= 0.85;
        }
        
        // 高级跳跃逻辑
        const ballDistance = Math.sqrt(
            Math.pow(this.ball.x - (this.ai.x + 20), 2) + 
            Math.pow(this.ball.y - (this.ai.y + 40), 2)
        );
        
        const shouldJump = (
            this.ball.y < this.ai.y + 30 && 
            ballDistance < 90 && 
            this.ai.onGround && 
            this.ball.vy > -3 &&
            prediction.maxHeight < this.ai.y
        );
        
        if (shouldJump) {
            this.aiJump();
        }
        
        // 精准击球时机判断
        const optimalHitDistance = tactic === 'aggressive' ? 75 : 65;
        if (ballDistance < optimalHitDistance && !this.ai.isSwinging) {
            const ballApproaching = this.isBallApproaching();
            const perfectTiming = this.calculateHitTiming(prediction);
            
            if ((ballApproaching && perfectTiming > 0.7) || ballDistance < 45) {
                this.ai.reactionTime = Math.max(1, 8 - prediction.confidence * 5);
                this.ai.currentTactic = tactic;
                this.aiSwing();
            }
        }
    }
    
    // 执行防守策略
    executeDefensiveStrategy(tactic, moveSpeed) {
        let defensiveX;
        
        switch (tactic) {
            case 'aggressive':
                defensiveX = 480 + Math.sin(Date.now() * 0.002) * 40;
                break;
            case 'defensive':
                defensiveX = 520 + Math.sin(Date.now() * 0.001) * 20;
                break;
            default:
                defensiveX = 500 + Math.sin(Date.now() * 0.0015) * 30;
        }
        
        // 根据玩家位置调整防守位置
        if (this.ai.playerTendency) {
            const playerX = this.ai.playerTendency.favoritePosition;
            if (playerX < 200) {
                defensiveX += 30; // 玩家偏左，AI偏右防守
            } else if (playerX > 300) {
                defensiveX -= 30; // 玩家偏右，AI偏左防守
            }
        }
        
        defensiveX = Math.max(430, Math.min(750, defensiveX));
        
        if (Math.abs(this.ai.x - defensiveX) > 8) {
            if (this.ai.x < defensiveX) {
                this.ai.vx = moveSpeed * 0.7;
            } else {
                this.ai.vx = -moveSpeed * 0.7;
            }
        } else {
            this.ai.vx *= 0.9;
        }
    }
    
    // 判断球是否正在接近AI
    isBallApproaching() {
        const ballToAI = {
            x: (this.ai.x + 20) - this.ball.x,
            y: (this.ai.y + 40) - this.ball.y
        };
        
        const ballVelocity = {
            x: this.ball.vx,
            y: this.ball.vy
        };
        
        // 计算球的速度向量与AI位置向量的点积
        const dotProduct = ballVelocity.x * ballToAI.x + ballVelocity.y * ballToAI.y;
        return dotProduct > 0;
    }
    
    // 计算最佳击球时机
    calculateHitTiming(prediction) {
        const distance = Math.sqrt(
            Math.pow(this.ball.x - (this.ai.x + 20), 2) + 
            Math.pow(this.ball.y - (this.ai.y + 40), 2)
        );
        
        const optimalDistance = 50;
        const timingScore = Math.max(0, 1 - Math.abs(distance - optimalDistance) / 30);
        
        // 考虑球的速度和方向
        const velocityFactor = Math.min(1, Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy) / 10);
        
        return timingScore * velocityFactor * prediction.confidence;
    }
    
    // 计算AI击球策略
    calculateAIHitStrategy() {
        const currentTactic = this.ai.currentTactic || 'adaptive';
        const playerX = this.player.x + 20;
        const aiX = this.ai.x + 20;
        const ballX = this.ball.x;
        
        let baseAngle, basePower;
        
        // 根据当前战术确定基础策略
        switch (currentTactic) {
            case 'aggressive':
                baseAngle = this.calculateAggressiveAngle(playerX, aiX);
                basePower = 7 + Math.random() * 2;
                break;
                
            case 'defensive':
                baseAngle = this.calculateDefensiveAngle();
                basePower = 5 + Math.random() * 1.5;
                break;
                
            case 'counter':
                baseAngle = this.calculateCounterAngle(playerX, aiX);
                basePower = 6.5 + Math.random() * 1.8;
                break;
                
            case 'adaptive':
            default:
                baseAngle = this.calculateAdaptiveAngle(playerX, aiX);
                basePower = 6 + Math.random() * 2;
                break;
        }
        
        // 根据玩家行为模式微调
        if (this.ai.playerTendency) {
            baseAngle = this.adjustAngleForPlayerTendency(baseAngle, this.ai.playerTendency);
        }
        
        // 根据难度调整精度
        const accuracyFactor = this.getAccuracyFactor();
        const finalAngle = baseAngle + (Math.random() - 0.5) * (1 - accuracyFactor) * 0.8;
        const finalPower = basePower * (0.9 + Math.random() * 0.2 * accuracyFactor);
        
        return {
            angle: finalAngle,
            power: finalPower,
            tactic: currentTactic,
            targetArea: this.calculateTargetArea(finalAngle, finalPower)
        };
    }
    
    // 计算激进角度
    calculateAggressiveAngle(playerX, aiX) {
        // 瞄准玩家难以到达的角落
        if (playerX < 150) {
            return -Math.PI / 8; // 向右下角快速击球
        } else if (playerX > 250) {
            return -Math.PI * 7 / 8; // 向左下角快速击球
        } else {
            // 玩家在中间，选择更远的角落
            return playerX < 200 ? -Math.PI / 6 : -Math.PI * 5 / 6;
        }
    }
    
    // 计算防守角度
    calculateDefensiveAngle() {
        // 高弧线安全回球
        return -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    }
    
    // 计算反击角度
    calculateCounterAngle(playerX, aiX) {
        // 根据玩家位置选择反方向
        const playerSide = playerX < 200 ? 'left' : 'right';
        
        if (playerSide === 'left') {
            return -Math.PI / 4 + (Math.random() - 0.5) * 0.3; // 向右侧反击
        } else {
            return -Math.PI * 3 / 4 + (Math.random() - 0.5) * 0.3; // 向左侧反击
        }
    }
    
    // 计算自适应角度
    calculateAdaptiveAngle(playerX, aiX) {
        // 综合考虑多种因素
        const distanceToPlayer = Math.abs(playerX - ballX);
        
        if (distanceToPlayer > 100) {
            // 玩家距离球较远，可以打角度球
            return playerX < 200 ? -Math.PI / 3 : -Math.PI * 2 / 3;
        } else {
            // 玩家距离球较近，打高球或变线
            return -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        }
    }
    
    // 根据玩家倾向调整角度
    adjustAngleForPlayerTendency(baseAngle, tendency) {
        if (tendency.isAggressive) {
            // 对付激进玩家，使用更多变化
            return baseAngle + (Math.random() - 0.5) * 0.4;
        } else {
            // 对付保守玩家，可以更直接
            return baseAngle + (Math.random() - 0.5) * 0.2;
        }
    }
    
    // 获取精度因子
    getAccuracyFactor() {
        switch (this.settings.difficulty) {
            case 'easy': return 0.6;
            case 'medium': return 0.8;
            case 'hard': return 0.95;
            default: return 0.7;
        }
    }
    
    // 计算目标区域
    calculateTargetArea(angle, power) {
        const distance = power * 15; // 估算距离
        const targetX = this.ai.x + Math.cos(angle) * distance;
        const targetY = this.ai.y + Math.sin(angle) * distance;
        
        return { x: targetX, y: targetY };
    }
    
    // 记录AI策略用于学习
    recordAIStrategy(strategy) {
        if (!this.ai.learningData.strategyHistory) {
            this.ai.learningData.strategyHistory = [];
        }
        
        const record = {
            ...strategy,
            timestamp: Date.now(),
            gameState: {
                score: { ...this.score },
                playerPosition: this.player.x,
                ballPosition: { x: this.ball.x, y: this.ball.y }
            }
        };
        
        this.ai.learningData.strategyHistory.push(record);
        
        // 保持最近50次记录
        if (this.ai.learningData.strategyHistory.length > 50) {
            this.ai.learningData.strategyHistory.shift();
        }
        
        // 分析策略成功率
        this.analyzeStrategySuccess();
    }
    
    // 分析策略成功率
    analyzeStrategySuccess() {
        if (this.ai.learningData.strategyHistory.length < 5) return;
        
        const recentStrategies = this.ai.learningData.strategyHistory.slice(-10);
        const tacticSuccess = {};
        
        recentStrategies.forEach(strategy => {
            if (!tacticSuccess[strategy.tactic]) {
                tacticSuccess[strategy.tactic] = { success: 0, total: 0 };
            }
            tacticSuccess[strategy.tactic].total++;
            
            // 简单的成功判定：如果AI在这次击球后得分或保持优势
            if (this.score.ai > strategy.gameState.score.ai) {
                tacticSuccess[strategy.tactic].success++;
            }
        });
        
        // 更新AI偏好
         this.ai.tacticPreference = tacticSuccess;
     }
     
     // 更新AI情绪状态
     updateAIMood() {
         const learningData = this.ai.learningData;
         
         // 计算最近的表现
         if (learningData.recentResults.length >= 3) {
             const recentWins = learningData.recentResults.slice(-5).filter(r => r === 'win').length;
             const recentLosses = learningData.recentResults.slice(-5).filter(r => r === 'loss').length;
             
             // 更新动量
             learningData.momentum = Math.max(-5, Math.min(5, recentWins - recentLosses));
             
             // 更新信心值
             const winRate = recentWins / Math.min(5, learningData.recentResults.length);
             learningData.confidence = Math.max(0.1, Math.min(0.9, winRate * 0.8 + 0.2));
         }
         
         // 根据比分差异调整情绪
         const scoreDiff = this.score.ai - this.score.player;
         if (scoreDiff > 2) {
             learningData.confidence = Math.min(0.9, learningData.confidence + 0.1);
         } else if (scoreDiff < -2) {
             learningData.confidence = Math.max(0.1, learningData.confidence - 0.1);
         }
     }
     
     // 记录比赛结果
     recordMatchResult(result) {
         if (!this.ai.learningData.recentResults) {
             this.ai.learningData.recentResults = [];
         }
         
         this.ai.learningData.recentResults.push(result);
         
         // 保持最近10次结果
         if (this.ai.learningData.recentResults.length > 10) {
             this.ai.learningData.recentResults.shift();
         }
     }
     
     // 根据情绪调整AI参数
     applyMoodModifiers(baseParams) {
         const mood = this.ai.learningData;
         const confidence = mood.confidence;
         const momentum = mood.momentum;
         
         // 信心影响反应速度和精度
         if (confidence > 0.7) {
             // 高信心：更快反应，更高精度
             baseParams.reactionDelay = Math.max(1, baseParams.reactionDelay - 2);
             baseParams.predictionAccuracy = Math.min(0.98, baseParams.predictionAccuracy + 0.05);
         } else if (confidence < 0.3) {
             // 低信心：较慢反应，较低精度
             baseParams.reactionDelay += 3;
             baseParams.predictionAccuracy = Math.max(0.5, baseParams.predictionAccuracy - 0.1);
         }
         
         // 动量影响移动速度和攻击性
         if (momentum > 2) {
             // 连胜状态：更激进
             baseParams.moveSpeed *= 1.1;
             baseParams.strategicThinking = Math.min(1, baseParams.strategicThinking + 0.1);
         } else if (momentum < -2) {
             // 连败状态：更保守
             baseParams.moveSpeed *= 0.9;
             baseParams.strategicThinking = Math.max(0, baseParams.strategicThinking - 0.1);
         }
         
         return baseParams;
     }
     
     updateBall() {
        // 更新轨迹
        this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
        if (this.ball.trail.length > 10) {
            this.ball.trail.shift();
        }
        
        // 重力
        this.ball.vy += this.ball.gravity;
        
        // 更新位置
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;
        
        // 边界反弹
        if (this.ball.y > 580) {
            this.ball.y = 580;
            this.ball.vy *= -this.ball.bounce;
            this.ball.vx *= 0.9;
            this.createBounceEffect(this.ball.x, this.ball.y);
            this.playSound('bounce');
        }
        
        if (this.ball.y < 0) {
            this.ball.y = 0;
            this.ball.vy *= -this.ball.bounce;
            this.playSound('bounce');
        }
    }
    
    checkCollisions() {
        // 网子碰撞
        if (this.ball.x > this.net.x - this.ball.radius && 
            this.ball.x < this.net.x + this.net.width + this.ball.radius &&
            this.ball.y > this.net.y - this.ball.radius) {
            
            if (this.ball.vx > 0) {
                this.ball.x = this.net.x - this.ball.radius;
            } else {
                this.ball.x = this.net.x + this.net.width + this.ball.radius;
            }
            this.ball.vx *= -0.8;
            this.createHitEffect(this.ball.x, this.ball.y);
            this.playSound('bounce');
        }
    }
    
    checkScoring() {
        // 玩家得分（球落在AI一侧）
        if (this.ball.x > 400 && this.ball.y > 580 && this.ball.vy > 0) {
            this.updateScore('player');
        }
        // AI得分（球落在玩家一侧）
        else if (this.ball.x < 400 && this.ball.y > 580 && this.ball.vy > 0) {
            this.updateScore('ai');
        }
    }
    
    playerJump() {
        if (this.player.onGround) {
            this.player.vy = this.player.jumpPower;
            this.player.onGround = false;
            this.playSound('jump');
        }
    }
    
    aiJump() {
        if (this.ai.onGround) {
            this.ai.vy = this.ai.jumpPower;
            this.ai.onGround = false;
        }
    }
    
    playerSwing() {
        if (!this.player.isSwinging) {
            this.player.isSwinging = true;
            this.player.swingTimer = 0;
            
            // 检查是否击中球
            const distance = Math.sqrt(
                Math.pow(this.ball.x - (this.player.x + 20), 2) + 
                Math.pow(this.ball.y - (this.player.y + 40), 2)
            );
            
            if (distance < 50) {
                this.hitBall(this.player.x + 20, this.player.y + 40, 'player');
            }
            
            this.playSound('swing');
        }
    }
    
    aiSwing() {
        if (!this.ai.isSwinging) {
            this.ai.isSwinging = true;
            this.ai.swingTimer = 0;
            
            // 检查是否击中球
            const distance = Math.sqrt(
                Math.pow(this.ball.x - (this.ai.x + 20), 2) + 
                Math.pow(this.ball.y - (this.ai.y + 40), 2)
            );
            
            if (distance < 60) {
                this.hitBall(this.ai.x + 20, this.ai.y + 40, 'ai');
            }
        }
    }
    
    hitBall(x, y, hitter) {
        // 计算击球方向和力度
        const dx = this.ball.x - x;
        const dy = this.ball.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 50) {
            let power = 8;
            if (hitter === 'player') {
                // 玩家击球方向基于按键方向
                let hitAngle = -Math.PI / 4; // 默认向右上方击球
                
                // 根据移动方向调整击球角度
                if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
                    hitAngle = -Math.PI * 3 / 4; // 向左上方
                } else if (this.keys['ArrowRight'] || this.keys['KeyD']) {
                    hitAngle = -Math.PI / 4; // 向右上方
                } else {
                    // 根据球的位置智能选择方向
                    if (this.ball.x < x) {
                        hitAngle = -Math.PI * 3 / 4; // 球在左边，向左上击
                    } else {
                        hitAngle = -Math.PI / 4; // 球在右边，向右上击
                    }
                }
                
                this.ball.vx = Math.cos(hitAngle) * power;
                this.ball.vy = Math.sin(hitAngle) * power;
            } else {
                // AI高级智能击球策略
                const aiStrategy = this.calculateAIHitStrategy();
                power = aiStrategy.power;
                
                this.ball.vx = Math.cos(aiStrategy.angle) * power;
                this.ball.vy = Math.sin(aiStrategy.angle) * power;
                
                // 记录AI击球策略用于学习
                this.recordAIStrategy(aiStrategy);
            }
            
            this.createHitEffect(this.ball.x, this.ball.y);
            this.playSound('hit');
        }
    }
    
    updateScore(scorer) {
        this.score[scorer]++;
        
        // 记录AI的比赛结果用于学习
        if (scorer === 'ai') {
            this.recordMatchResult('win');
        } else {
            this.recordMatchResult('loss');
        }
        
        // 立即更新UI显示
        this.updateUI();
        
        // 创建得分特效
        this.createScoreEffect(scorer);
        
        // 播放得分音效
        this.playSound('score');
        
        if (this.score[scorer] >= this.settings.targetScore) {
            this.endSet(scorer);
        } else {
            this.createCelebration();
            
            // 暂停游戏循环，显示得分
            this.gameState = 'scoring';
            setTimeout(() => {
                if (this.gameState === 'scoring') {
                    this.gameState = 'playing';
                    this.serveBall();
                }
            }, 2000);
        }
    }
    
    endSet(winner) {
        // 增加获胜者的局数
        if (winner === 'player') {
            this.match.playerSets++;
        } else {
            this.match.aiSets++;
        }
        
        // 检查是否有人赢得整个比赛
        if (this.match.playerSets >= this.match.setsToWin || this.match.aiSets >= this.match.setsToWin) {
            this.endMatch(winner);
        } else {
            // 进入下一局
            this.match.currentSet++;
            this.score.player = 0;
            this.score.ai = 0;
            
            // 显示局结束信息
            const setMessage = winner === 'player' ? 
                `第${this.match.currentSet - 1}局获胜！` : 
                `第${this.match.currentSet - 1}局失败！`;
            
            this.gameState = 'setOver';
            this.showSetModal('局结束', setMessage);
            
            // 3秒后开始下一局
            setTimeout(() => {
                this.hideModal();
                this.gameState = 'playing';
                this.serveBall();
                this.updateUI();
            }, 3000);
        }
    }
    
    async endMatch(winner) {
        this.gameState = 'gameOver';
        
        // 计算积分奖励
        let pointsEarned = 0;
        if (winner === 'player') {
            pointsEarned = 100; // 获胜基础积分
            if (this.match.playerSets === 2 && this.match.aiSets === 0) {
                pointsEarned += 50; // 2:0获胜额外奖励
            }
        } else {
            pointsEarned = 20; // 失败安慰积分
        }
        
        const title = winner === 'player' ? '恭喜获胜！' : '比赛结束';
        let message = winner === 'player' ? 
            `你以 ${this.match.playerSets}:${this.match.aiSets} 赢得了比赛！` :
            `电脑以 ${this.match.aiSets}:${this.match.playerSets} 赢得了比赛！`;
        
        // 如果用户已登录，记录游戏结果和积分
        if (window.authManager && window.authManager.isLoggedIn()) {
            try {
                await window.authManager.earnPoints(pointsEarned, winner === 'player' ? 'win' : 'loss');
                message += `\n\n获得积分: +${pointsEarned}`;
                
                // 更新用户面板显示
                if (window.uiManager) {
                    window.uiManager.updateUserPanel();
                }
            } catch (error) {
                console.error('记录游戏结果失败:', error);
            }
        } else {
            message += `\n\n登录后可获得积分奖励！`;
        }
        
        this.showModal(title, message);
        this.updateUI();
    }
    
    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景
        this.drawBackground();
        
        // 绘制球场
        this.drawCourt();
        
        // 绘制球的轨迹
        this.drawBallTrail();
        
        // 绘制球
        this.drawBall();
        
        // 绘制火柴人
        this.drawStickman(this.player, '#FF6B6B');
        this.drawStickman(this.ai, '#4ECDC4');
        
        // 绘制特效
        this.drawParticles();
        this.drawEffects();
        
        // 绘制UI
        this.drawGameUI();
    }
    
    drawBackground() {
        // 天空渐变
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawCourt() {
        // 地面
        this.ctx.fillStyle = '#90EE90';
        this.ctx.fillRect(0, 530, this.canvas.width, 70);
        
        // 中线
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.moveTo(400, 530);
        this.ctx.lineTo(400, 600);
        this.ctx.stroke();
        
        // 网子
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(this.net.x, this.net.y, this.net.width, this.net.height);
        
        // 网格
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.net.x, this.net.y + i * 15);
            this.ctx.lineTo(this.net.x + this.net.width, this.net.y + i * 15);
            this.ctx.stroke();
        }
    }
    
    drawBallTrail() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let i = 0; i < this.ball.trail.length; i++) {
            const point = this.ball.trail[i];
            if (i === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        }
        this.ctx.stroke();
    }
    
    drawBall() {
        // 球的阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(this.ball.x + 2, this.ball.y + 2, this.ball.radius, this.ball.radius * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 球
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 球的纹理
        this.ctx.strokeStyle = '#DDD';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.ball.x - this.ball.radius, this.ball.y);
        this.ctx.lineTo(this.ball.x + this.ball.radius, this.ball.y);
        this.ctx.moveTo(this.ball.x, this.ball.y - this.ball.radius);
        this.ctx.lineTo(this.ball.x, this.ball.y + this.ball.radius);
        this.ctx.stroke();
    }
    
    drawStickman(stickman, color) {
        const ctx = this.ctx;
        const x = stickman.x;
        const y = stickman.y;
        const isPlayer = color === '#FF6B6B';
        
        // 设置绘制样式
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // 头部 - 现代化设计
        ctx.beginPath();
        ctx.arc(x + 20, y + 12, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#FDBCB4'; // 更自然的肤色
        ctx.fill();
        ctx.strokeStyle = '#E8A598';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 头发 - 不同风格
        ctx.fillStyle = isPlayer ? '#8B4513' : '#2C1810'; // 玩家棕色，AI黑色
        ctx.beginPath();
        if (isPlayer) {
            // 玩家 - 现代短发
            ctx.ellipse(x + 20, y + 6, 13, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            // 刘海
            ctx.beginPath();
            ctx.arc(x + 15, y + 8, 4, 0, Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 25, y + 8, 4, 0, Math.PI);
            ctx.fill();
        } else {
            // AI - 酷炫发型
            ctx.ellipse(x + 20, y + 5, 14, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            // 侧分
            ctx.beginPath();
            ctx.moveTo(x + 10, y + 8);
            ctx.quadraticCurveTo(x + 15, y + 2, x + 25, y + 6);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#1A0E08';
            ctx.stroke();
        }
        
        // 眼睛 - 更有表情
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 10, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 24, y + 10, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 瞳孔
        ctx.fillStyle = isPlayer ? '#4A90E2' : '#E74C3C'; // 玩家蓝眼，AI红眼
        ctx.beginPath();
        ctx.arc(x + 16, y + 10, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 24, y + 10, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 高光
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x + 17, y + 9, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 25, y + 9, 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // 嘴巴 - 更生动
        ctx.strokeStyle = '#D4756B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (stickman.isSwinging) {
            // 挥拍时张嘴
            ctx.ellipse(x + 20, y + 15, 2, 3, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // 正常微笑
            ctx.arc(x + 20, y + 14, 3, 0, Math.PI);
            ctx.stroke();
        }
        
        // 身体 - 运动服装
        ctx.fillStyle = isPlayer ? '#4A90E2' : '#E74C3C'; // 玩家蓝色，AI红色运动服
        ctx.beginPath();
        ctx.roundRect(x + 12, y + 22, 16, 25, 3);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 运动服装饰
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(isPlayer ? 'P' : 'AI', x + 20, y + 37);
        
        // 护腕
        ctx.fillStyle = isPlayer ? '#2E5BBA' : '#B71C1C';
        ctx.beginPath();
        ctx.roundRect(x + 30, y + 40, 6, 4, 2);
        ctx.fill();
        
        // 手臂动画
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#FDBCB4';
        if (stickman.isSwinging && stickman.swingTimer < 15) {
            // 挥拍动作 - 更流畅的动画
            const swingProgress = stickman.swingTimer / 15;
            const armAngle = Math.sin(swingProgress * Math.PI) * 1.2;
            
            ctx.beginPath();
            ctx.moveTo(x + 20, y + 30);
            ctx.lineTo(x + 20 + Math.cos(armAngle) * 22, y + 20 + Math.sin(armAngle) * 18);
            ctx.stroke();
            
            // 专业球拍设计
            const racketX = x + 20 + Math.cos(armAngle) * 28;
            const racketY = y + 20 + Math.sin(armAngle) * 22;
            
            // 球拍柄 - 渐变效果
            const gradient = ctx.createLinearGradient(racketX - 3, racketY, racketX + 3, racketY + 15);
            gradient.addColorStop(0, '#8B4513');
            gradient.addColorStop(1, '#5D2F0A');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(racketX - 2, racketY, 4, 15, 2);
            ctx.fill();
            
            // 球拍面 - 椭圆形
            ctx.strokeStyle = isPlayer ? '#FF6B6B' : '#4ECDC4';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(racketX, racketY - 10, 8, 12, armAngle * 0.3, 0, Math.PI * 2);
            ctx.stroke();
            
            // 球拍网格 - 更精细
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            for (let i = -6; i <= 6; i += 3) {
                ctx.beginPath();
                ctx.moveTo(racketX + i, racketY - 18);
                ctx.lineTo(racketX + i, racketY - 2);
                ctx.stroke();
            }
            for (let i = -18; i <= -2; i += 4) {
                ctx.beginPath();
                ctx.moveTo(racketX - 6, racketY + i);
                ctx.lineTo(racketX + 6, racketY + i);
                ctx.stroke();
            }
            
            // 挥拍特效
            ctx.strokeStyle = isPlayer ? 'rgba(255, 107, 107, 0.6)' : 'rgba(78, 205, 196, 0.6)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(racketX, racketY - 10, 15, armAngle - 0.5, armAngle + 0.5);
            ctx.stroke();
        } else {
            // 正常手臂姿态
            ctx.beginPath();
            ctx.moveTo(x + 20, y + 30);
            ctx.lineTo(x + 32, y + 42);
            ctx.stroke();
        }
        
        // 另一只手臂
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 30);
        ctx.lineTo(x + 8, y + 42);
        ctx.stroke();
        
        // 运动短裤
        ctx.fillStyle = isPlayer ? '#2E5BBA' : '#B71C1C';
        ctx.beginPath();
        ctx.roundRect(x + 14, y + 47, 12, 12, 2);
        ctx.fill();
        
        // 腿部 - 更健壮
        ctx.strokeStyle = '#FDBCB4';
        ctx.lineWidth = 6;
        if (stickman.onGround) {
            // 站立姿态
            ctx.beginPath();
            ctx.moveTo(x + 18, y + 59);
            ctx.lineTo(x + 15, y + 75);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x + 22, y + 59);
            ctx.lineTo(x + 25, y + 75);
            ctx.stroke();
            
            // 专业运动鞋
            ctx.fillStyle = isPlayer ? '#1976D2' : '#D32F2F';
            ctx.beginPath();
            ctx.roundRect(x + 10, y + 75, 10, 6, 3);
            ctx.fill();
            ctx.beginPath();
            ctx.roundRect(x + 20, y + 75, 10, 6, 3);
            ctx.fill();
            
            // 鞋带
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 12, y + 76);
            ctx.lineTo(x + 18, y + 78);
            ctx.moveTo(x + 22, y + 76);
            ctx.lineTo(x + 28, y + 78);
            ctx.stroke();
        } else {
            // 跳跃姿态 - 更动感
            ctx.beginPath();
            ctx.moveTo(x + 18, y + 59);
            ctx.lineTo(x + 10, y + 68);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x + 22, y + 59);
            ctx.lineTo(x + 30, y + 68);
            ctx.stroke();
            
            // 跳跃时的鞋子
            ctx.fillStyle = isPlayer ? '#1976D2' : '#D32F2F';
            ctx.beginPath();
            ctx.roundRect(x + 5, y + 68, 10, 6, 3);
            ctx.fill();
            ctx.beginPath();
            ctx.roundRect(x + 25, y + 68, 10, 6, 3);
            ctx.fill();
        }
        
        // 能量光环效果
        if (!stickman.onGround || stickman.isSwinging) {
            ctx.strokeStyle = isPlayer ? 'rgba(74, 144, 226, 0.4)' : 'rgba(231, 76, 60, 0.4)';
            ctx.lineWidth = 3;
            
            for (let i = 1; i <= 2; i++) {
                ctx.globalAlpha = 0.3 / i;
                ctx.beginPath();
                ctx.arc(x + 20, y + 40, 25 + i * 8, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
        
        // 汗水效果（激烈运动时）
        if (stickman.isSwinging && Math.random() < 0.3) {
            ctx.fillStyle = 'rgba(135, 206, 235, 0.8)';
            ctx.beginPath();
            ctx.arc(x + 15 + Math.random() * 10, y + 8 + Math.random() * 5, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawEffects() {
        this.effects.forEach(effect => {
            this.ctx.globalAlpha = effect.alpha;
            
            if (effect.type === 'scoreText') {
                // 绘制得分文字
                this.ctx.fillStyle = effect.color;
                this.ctx.font = `bold ${24 * effect.scale}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(effect.text, effect.x, effect.y);
            } else {
                // 绘制冲击波效果
                this.ctx.strokeStyle = effect.color;
                this.ctx.lineWidth = effect.width || 3;
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawGameUI() {
        if (this.gameState === 'ready') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('火柴人羽毛球', 400, 250);
            
            this.ctx.font = '18px Arial';
            this.ctx.fillText('使用 A/D 或 ←/→ 移动', 400, 300);
            this.ctx.fillText('按空格键跳跃', 400, 325);
            this.ctx.fillText('按W键或↑键挥拍击球', 400, 350);
            this.ctx.fillText('点击开始游戏', 400, 400);
        } else if (this.gameState === 'paused') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('游戏暂停', 400, 300);
        }
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1;
            particle.alpha -= 0.02;
            particle.size *= 0.98;
            return particle.alpha > 0 && particle.size > 0.1;
        });
    }
    
    updateEffects() {
        this.effects = this.effects.filter(effect => {
            if (effect.type === 'scoreText') {
                effect.y += effect.vy;
                effect.vy *= 0.95;
                effect.alpha -= 0.02;
                effect.scale += 0.02;
                effect.life--;
                return effect.life > 0 && effect.alpha > 0;
            } else {
                effect.radius += effect.speed || 3;
                effect.alpha -= 0.05;
                if (effect.width) effect.width *= 0.95;
                return effect.alpha > 0;
            }
        });
    }
    
    createHitEffect(x, y) {
        // 粒子效果
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                size: Math.random() * 4 + 2,
                alpha: 1,
                color: `hsl(${Math.random() * 60 + 30}, 100%, 60%)`
            });
        }
        
        // 冲击波效果
        this.effects.push({
            x: x,
            y: y,
            radius: 0,
            speed: 3,
            alpha: 1,
            width: 3,
            color: '#FFD700'
        });
    }
    
    createBounceEffect(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 5,
                size: Math.random() * 3 + 1,
                alpha: 1,
                color: '#90EE90'
            });
        }
    }
    
    createCelebration() {
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: 400 + (Math.random() - 0.5) * 200,
                y: 300 + (Math.random() - 0.5) * 100,
                vx: (Math.random() - 0.5) * 15,
                vy: -Math.random() * 10 - 5,
                size: Math.random() * 8 + 4,
                alpha: 1,
                color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                type: 'celebration'
            });
        }
    }
    
    createScoreEffect(scorer) {
        const x = scorer === 'player' ? 200 : 600;
        const color = scorer === 'player' ? '#4CAF50' : '#FF5722';
        
        // 得分文字效果
        this.effects.push({
            type: 'scoreText',
            x: x,
            y: 200,
            text: '+1',
            color: color,
            alpha: 1,
            scale: 1,
            vy: -2,
            life: 60
        });
        
        // 得分粒子爆炸
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: 200,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                size: Math.random() * 5 + 2,
                alpha: 1,
                color: color,
                type: 'score'
            });
        }
    }
    
    updateAIDifficulty() {
        // 根据难度调整AI参数
        switch (this.settings.difficulty) {
            case 'easy':
                this.ai.speed = 2;
                break;
            case 'medium':
                this.ai.speed = 3;
                break;
            case 'hard':
                this.ai.speed = 4;
                break;
        }
    }
    
    playSound(type) {
        if (!this.settings.soundEnabled) return;
        
        try {
            // 简单的音效模拟
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            switch (type) {
                case 'hit':
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
                case 'swing':
                    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
                case 'jump':
                    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.2);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                    oscillator.stop(audioContext.currentTime + 0.2);
                    break;
                case 'score':
                    // 得分音效 - 上升音调
                    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
                    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    oscillator.stop(audioContext.currentTime + 0.3);
                    break;
                case 'bounce':
                    // 弹跳音效
                    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.05);
                    gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
                    oscillator.stop(audioContext.currentTime + 0.05);
                    break;
            }
            
            oscillator.start(audioContext.currentTime);
        } catch (error) {
            console.log('音效播放失败:', error);
        }
    }
    
    showModal(title, message) {
        document.getElementById('gameOverTitle').textContent = title;
        document.getElementById('gameOverMessage').textContent = message;
        document.getElementById('gameOverModal').style.display = 'flex';
    }
    
    showSetModal(title, message) {
        // 使用相同的模态框，但不显示按钮
        document.getElementById('gameOverTitle').textContent = title;
        document.getElementById('gameOverMessage').textContent = message;
        document.getElementById('gameOverModal').style.display = 'flex';
        
        // 隐藏按钮
        document.getElementById('playAgainBtn').style.display = 'none';
        document.getElementById('closeModalBtn').style.display = 'none';
    }
    
    hideModal() {
        document.getElementById('gameOverModal').style.display = 'none';
        // 恢复按钮显示
        document.getElementById('playAgainBtn').style.display = 'block';
        document.getElementById('closeModalBtn').style.display = 'block';
    }
    
    updateUI() {
        document.getElementById('playerScore').textContent = this.score.player;
        document.getElementById('aiScore').textContent = this.score.ai;
        
        // 更新局数显示
        const matchInfo = document.getElementById('matchInfo');
        if (matchInfo) {
            matchInfo.textContent = `第${this.match.currentSet}局 | 局数: ${this.match.playerSets} - ${this.match.aiSets}`;
        }
        
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        switch (this.gameState) {
            case 'ready':
                startBtn.textContent = '开始游戏';
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                break;
            case 'playing':
                startBtn.disabled = true;
                pauseBtn.textContent = '暂停';
                pauseBtn.disabled = false;
                break;
            case 'paused':
                pauseBtn.textContent = '继续';
                break;
            case 'gameOver':
                startBtn.textContent = '重新开始';
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                break;
        }
    }
    
    showError(message) {
        console.error(message);
        alert(message);
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    // 初始化认证管理器
    window.authManager = new AuthManager();
    
    // 初始化UI管理器
    window.uiManager = new UIManager();
    
    // 初始化游戏
    window.game = new StickmanBadmintonGame();
});

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StickmanBadmintonGame;
}