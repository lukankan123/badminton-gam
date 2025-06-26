from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import hashlib
import jwt
import datetime
import os
from pathlib import Path

# 创建FastAPI应用
app = FastAPI(
    title="羽毛球游戏API",
    description="羽毛球游戏后端API服务",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT配置
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# 安全认证
security = HTTPBearer()

# 数据库路径
DB_PATH = Path(__file__).parent / "game.db"

# Pydantic模型
class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class GameRecord(BaseModel):
    game_type: str
    result: str  # 'win', 'lose', 'draw'
    points_earned: int
    duration: int  # 游戏时长（秒）
    player_score: int
    ai_score: int
    sets_won: int
    sets_lost: int

class PurchaseItem(BaseModel):
    item_id: int
    item_type: str

class EquipItem(BaseModel):
    item_id: int
    item_type: str

# 数据库初始化
def init_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 用户表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            total_points INTEGER DEFAULT 0,
            current_points INTEGER DEFAULT 0,
            games_played INTEGER DEFAULT 0,
            games_won INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 游戏记录表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS game_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game_type TEXT NOT NULL,
            result TEXT NOT NULL,
            points_earned INTEGER NOT NULL,
            duration INTEGER NOT NULL,
            player_score INTEGER NOT NULL,
            ai_score INTEGER NOT NULL,
            sets_won INTEGER NOT NULL,
            sets_lost INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 用户装备表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            item_type TEXT NOT NULL,
            item_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            is_equipped BOOLEAN DEFAULT FALSE,
            purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 商店物品表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS shop_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            price INTEGER NOT NULL,
            description TEXT,
            image_url TEXT,
            attributes TEXT,  -- JSON格式的属性加成
            is_available BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 插入默认商店物品
    default_items = [
        # 球拍
        ('专业球拍', 'racket', 800, '提升击球力量和精准度', '/images/racket_pro.png', '{"power": 10, "accuracy": 15}', True),
        ('高级球拍', 'racket', 1500, '显著提升所有属性', '/images/racket_advanced.png', '{"power": 20, "accuracy": 25, "speed": 10}', True),
        ('传奇球拍', 'racket', 3000, '顶级球拍，全面提升', '/images/racket_legendary.png', '{"power": 35, "accuracy": 40, "speed": 20}', True),
        
        # 服装
        ('运动套装', 'outfit', 300, '专业运动员套装', '/images/outfit_sport.png', '{"speed": 5, "stamina": 10}', True),
        ('休闲装', 'outfit', 200, '舒适的休闲运动装', '/images/outfit_casual.png', '{"comfort": 10}', True),
        ('科技战衣', 'outfit', 1000, '未来科技风格战衣', '/images/outfit_tech.png', '{"power": 15, "speed": 15, "accuracy": 10}', True),
        ('传奇战袍', 'outfit', 2500, '传说中的战袍', '/images/outfit_legendary.png', '{"power": 25, "speed": 25, "accuracy": 20, "stamina": 20}', True),
        
        # 配饰
        ('能量头带', 'accessory', 150, '增加专注力', '/images/headband_energy.png', '{"accuracy": 8}', True),
        ('力量护腕', 'accessory', 200, '增强击球力量', '/images/wristband_power.png', '{"power": 12}', True),
        ('速度靴', 'accessory', 250, '提升移动速度', '/images/shoes_speed.png', '{"speed": 15}', True),
        ('光环特效', 'accessory', 500, '炫酷的光环特效', '/images/aura_effect.png', '{"charisma": 100}', True),
        
        # 道具
        ('双倍积分卡', 'consumable', 500, '下一场比赛获得双倍积分', '/images/card_double_points.png', '{"effect": "double_points"}', True),
        ('技能加成卡', 'consumable', 200, '临时提升所有属性', '/images/card_skill_boost.png', '{"effect": "skill_boost"}', True),
        ('幸运加成卡', 'consumable', 300, '增加获得稀有奖励的几率', '/images/card_lucky.png', '{"effect": "lucky_boost"}', True),
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO shop_items (name, type, price, description, image_url, attributes, is_available)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', default_items)
    
    conn.commit()
    conn.close()

# 工具函数
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_jwt_token(user_id: int, username: str) -> str:
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token已过期")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="无效的token")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    return payload

def get_db_connection():
    return sqlite3.connect(DB_PATH)

# API路由
@app.on_event("startup")
async def startup_event():
    init_database()

@app.get("/")
async def root():
    return {"message": "羽毛球游戏API服务正在运行"}

# 用户认证相关API
@app.post("/api/auth/register")
async def register(user: UserRegister):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 检查用户名和邮箱是否已存在
        cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (user.username, user.email))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="用户名或邮箱已存在")
        
        # 创建新用户
        password_hash = hash_password(user.password)
        cursor.execute(
            "INSERT INTO users (username, email, password_hash, current_points) VALUES (?, ?, ?, ?)",
            (user.username, user.email, password_hash, 1000)  # 新用户赠送1000积分
        )
        user_id = cursor.lastrowid
        
        # 给新用户添加基础装备
        cursor.execute(
            "INSERT INTO user_items (user_id, item_type, item_id, item_name, is_equipped) VALUES (?, ?, ?, ?, ?)",
            (user_id, 'racket', 0, '基础球拍', True)
        )
        cursor.execute(
            "INSERT INTO user_items (user_id, item_type, item_id, item_name, is_equipped) VALUES (?, ?, ?, ?, ?)",
            (user_id, 'outfit', 0, '基础服装', True)
        )
        
        conn.commit()
        
        # 生成JWT token
        token = create_jwt_token(user_id, user.username)
        
        return {
            "message": "注册成功",
            "token": token,
            "user": {
                "id": user_id,
                "username": user.username,
                "email": user.email,
                "current_points": 1000
            }
        }
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"注册失败: {str(e)}")
    finally:
        conn.close()

@app.post("/api/auth/login")
async def login(user: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 查找用户
        cursor.execute(
            "SELECT id, username, email, password_hash, current_points, total_points, games_played, games_won FROM users WHERE username = ?",
            (user.username,)
        )
        user_data = cursor.fetchone()
        
        if not user_data or not verify_password(user.password, user_data[3]):
            raise HTTPException(status_code=401, detail="用户名或密码错误")
        
        # 更新最后登录时间
        cursor.execute(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
            (user_data[0],)
        )
        conn.commit()
        
        # 生成JWT token
        token = create_jwt_token(user_data[0], user_data[1])
        
        return {
            "message": "登录成功",
            "token": token,
            "user": {
                "id": user_data[0],
                "username": user_data[1],
                "email": user_data[2],
                "current_points": user_data[4],
                "total_points": user_data[5],
                "games_played": user_data[6],
                "games_won": user_data[7]
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"登录失败: {str(e)}")
    finally:
        conn.close()

@app.get("/api/auth/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT id, username, email, current_points, total_points, games_played, games_won, created_at, last_login FROM users WHERE id = ?",
            (current_user['user_id'],)
        )
        user_data = cursor.fetchone()
        
        if not user_data:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        return {
            "user": {
                "id": user_data[0],
                "username": user_data[1],
                "email": user_data[2],
                "current_points": user_data[3],
                "total_points": user_data[4],
                "games_played": user_data[5],
                "games_won": user_data[6],
                "win_rate": round(user_data[6] / max(user_data[5], 1) * 100, 2),
                "created_at": user_data[7],
                "last_login": user_data[8]
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户信息失败: {str(e)}")
    finally:
        conn.close()

# 积分管理API
@app.get("/api/points/balance")
async def get_points_balance(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT current_points, total_points FROM users WHERE id = ?",
            (current_user['user_id'],)
        )
        points_data = cursor.fetchone()
        
        return {
            "current_points": points_data[0],
            "total_points": points_data[1]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取积分失败: {str(e)}")
    finally:
        conn.close()

@app.post("/api/points/earn")
async def earn_points(record: GameRecord, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 记录游戏结果
        cursor.execute(
            "INSERT INTO game_records (user_id, game_type, result, points_earned, duration, player_score, ai_score, sets_won, sets_lost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (current_user['user_id'], record.game_type, record.result, record.points_earned, record.duration, record.player_score, record.ai_score, record.sets_won, record.sets_lost)
        )
        
        # 更新用户积分和统计
        cursor.execute(
            "UPDATE users SET current_points = current_points + ?, total_points = total_points + ?, games_played = games_played + 1, games_won = games_won + ? WHERE id = ?",
            (record.points_earned, record.points_earned, 1 if record.result == 'win' else 0, current_user['user_id'])
        )
        
        # 获取更新后的积分
        cursor.execute(
            "SELECT current_points, total_points FROM users WHERE id = ?",
            (current_user['user_id'],)
        )
        points_data = cursor.fetchone()
        
        conn.commit()
        
        return {
            "message": "积分记录成功",
            "points_earned": record.points_earned,
            "current_points": points_data[0],
            "total_points": points_data[1]
        }
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"记录积分失败: {str(e)}")
    finally:
        conn.close()

@app.get("/api/points/history")
async def get_points_history(current_user: dict = Depends(get_current_user), limit: int = 20):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT game_type, result, points_earned, duration, player_score, ai_score, sets_won, sets_lost, created_at FROM game_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (current_user['user_id'], limit)
        )
        records = cursor.fetchall()
        
        return {
            "records": [
                {
                    "game_type": record[0],
                    "result": record[1],
                    "points_earned": record[2],
                    "duration": record[3],
                    "player_score": record[4],
                    "ai_score": record[5],
                    "sets_won": record[6],
                    "sets_lost": record[7],
                    "created_at": record[8]
                }
                for record in records
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取积分历史失败: {str(e)}")
    finally:
        conn.close()

@app.get("/api/points/leaderboard")
async def get_leaderboard(limit: int = 10):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT username, total_points, games_played, games_won FROM users ORDER BY total_points DESC LIMIT ?",
            (limit,)
        )
        users = cursor.fetchall()
        
        return {
            "leaderboard": [
                {
                    "rank": idx + 1,
                    "username": user[0],
                    "total_points": user[1],
                    "games_played": user[2],
                    "games_won": user[3],
                    "win_rate": round(user[3] / max(user[2], 1) * 100, 2)
                }
                for idx, user in enumerate(users)
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取排行榜失败: {str(e)}")
    finally:
        conn.close()

# 商店系统API
@app.get("/api/shop/items")
async def get_shop_items(item_type: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if item_type:
            cursor.execute(
                "SELECT id, name, type, price, description, image_url, attributes FROM shop_items WHERE type = ? AND is_available = TRUE ORDER BY price",
                (item_type,)
            )
        else:
            cursor.execute(
                "SELECT id, name, type, price, description, image_url, attributes FROM shop_items WHERE is_available = TRUE ORDER BY type, price"
            )
        
        items = cursor.fetchall()
        
        return {
            "items": [
                {
                    "id": item[0],
                    "name": item[1],
                    "type": item[2],
                    "price": item[3],
                    "description": item[4],
                    "image_url": item[5],
                    "attributes": item[6]
                }
                for item in items
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取商店物品失败: {str(e)}")
    finally:
        conn.close()

@app.post("/api/shop/purchase")
async def purchase_item(purchase: PurchaseItem, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 检查物品是否存在
        cursor.execute(
            "SELECT name, price FROM shop_items WHERE id = ? AND is_available = TRUE",
            (purchase.item_id,)
        )
        item_data = cursor.fetchone()
        
        if not item_data:
            raise HTTPException(status_code=404, detail="物品不存在或不可购买")
        
        item_name, item_price = item_data
        
        # 检查用户是否已拥有该物品
        cursor.execute(
            "SELECT id FROM user_items WHERE user_id = ? AND item_id = ? AND item_type = ?",
            (current_user['user_id'], purchase.item_id, purchase.item_type)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="您已拥有该物品")
        
        # 检查用户积分是否足够
        cursor.execute(
            "SELECT current_points FROM users WHERE id = ?",
            (current_user['user_id'],)
        )
        current_points = cursor.fetchone()[0]
        
        if current_points < item_price:
            raise HTTPException(status_code=400, detail="积分不足")
        
        # 扣除积分
        cursor.execute(
            "UPDATE users SET current_points = current_points - ? WHERE id = ?",
            (item_price, current_user['user_id'])
        )
        
        # 添加物品到用户背包
        cursor.execute(
            "INSERT INTO user_items (user_id, item_type, item_id, item_name) VALUES (?, ?, ?, ?)",
            (current_user['user_id'], purchase.item_type, purchase.item_id, item_name)
        )
        
        conn.commit()
        
        return {
            "message": "购买成功",
            "item_name": item_name,
            "price": item_price,
            "remaining_points": current_points - item_price
        }
    
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"购买失败: {str(e)}")
    finally:
        conn.close()

@app.get("/api/shop/inventory")
async def get_user_inventory(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT item_type, item_id, item_name, is_equipped, purchased_at FROM user_items WHERE user_id = ? ORDER BY item_type, purchased_at",
            (current_user['user_id'],)
        )
        items = cursor.fetchall()
        
        return {
            "inventory": [
                {
                    "item_type": item[0],
                    "item_id": item[1],
                    "item_name": item[2],
                    "is_equipped": bool(item[3]),
                    "purchased_at": item[4]
                }
                for item in items
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取背包失败: {str(e)}")
    finally:
        conn.close()

@app.put("/api/shop/equip")
async def equip_item(equip: EquipItem, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 检查用户是否拥有该物品
        cursor.execute(
            "SELECT id FROM user_items WHERE user_id = ? AND item_id = ? AND item_type = ?",
            (current_user['user_id'], equip.item_id, equip.item_type)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="您没有该物品")
        
        # 取消装备同类型的其他物品
        cursor.execute(
            "UPDATE user_items SET is_equipped = FALSE WHERE user_id = ? AND item_type = ?",
            (current_user['user_id'], equip.item_type)
        )
        
        # 装备指定物品
        cursor.execute(
            "UPDATE user_items SET is_equipped = TRUE WHERE user_id = ? AND item_id = ? AND item_type = ?",
            (current_user['user_id'], equip.item_id, equip.item_type)
        )
        
        conn.commit()
        
        return {"message": "装备成功"}
    
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"装备失败: {str(e)}")
    finally:
        conn.close()

# 游戏统计API
@app.get("/api/game/stats")
async def get_game_stats(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 获取基本统计
        cursor.execute(
            "SELECT games_played, games_won, current_points, total_points FROM users WHERE id = ?",
            (current_user['user_id'],)
        )
        basic_stats = cursor.fetchone()
        
        # 获取最近游戏记录
        cursor.execute(
            "SELECT result, points_earned, created_at FROM game_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
            (current_user['user_id'],)
        )
        recent_games = cursor.fetchall()
        
        # 计算连胜记录
        win_streak = 0
        for game in recent_games:
            if game[0] == 'win':
                win_streak += 1
            else:
                break
        
        return {
            "stats": {
                "games_played": basic_stats[0],
                "games_won": basic_stats[1],
                "games_lost": basic_stats[0] - basic_stats[1],
                "win_rate": round(basic_stats[1] / max(basic_stats[0], 1) * 100, 2),
                "current_points": basic_stats[2],
                "total_points": basic_stats[3],
                "current_win_streak": win_streak
            },
            "recent_games": [
                {
                    "result": game[0],
                    "points_earned": game[1],
                    "date": game[2]
                }
                for game in recent_games
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取游戏统计失败: {str(e)}")
    finally:
        conn.close()

# 健康检查
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)