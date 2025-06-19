# Redis临时缓存配置指南

## 🎯 概述

本项目已升级为基于Redis的临时数据缓存架构，支持高性能的数据处理和会话管理。

## 🚀 快速启动

### 方法一：自动启动（推荐）
```bash
cd backend
python start_redis_backend.py
```

### 方法二：手动启动
```bash
# 1. 安装依赖
pip install -r requirements_redis.txt

# 2. 启动Redis（可选）
redis-server --daemonize yes

# 3. 启动后端
python ml_backend.py
```

## 📦 Redis安装

### macOS (Homebrew)
```bash
brew install redis
brew services start redis
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Windows
1. 下载Redis for Windows
2. 解压并运行redis-server.exe

## ⚙️ 配置选项

### 环境变量
```bash
# Redis连接配置
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_DB=0
export REDIS_PASSWORD=your_password  # 可选

# 缓存配置
export REDIS_DEFAULT_TTL=3600  # 默认过期时间(秒)
```

### 配置文件 (.env)
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_DEFAULT_TTL=3600
```

## 🔧 架构特性

### ✅ 核心优势
- **自动过期清理** - 无需手动管理数据生命周期
- **高性能访问** - 内存级别的读写速度
- **降级机制** - Redis不可用时自动切换到内存缓存
- **数据压缩** - 自动压缩DataFrame减少内存占用
- **会话管理** - 完整的会话生命周期管理

### 📊 数据存储结构
```
session:{session_id}:info          # 会话基本信息
session:{session_id}:raw_data       # 原始数据
session:{session_id}:processed_data # 处理后数据
session:{session_id}:metadata       # 数据元信息
session:{session_id}:training_progress # 训练进度
```

## 🔍 API端点

### 会话管理
- `POST /sessions` - 创建新会话
- `GET /sessions/{session_id}` - 获取会话信息
- `GET /sessions` - 列出所有会话
- `DELETE /sessions/{session_id}` - 删除会话

### 数据处理
- `POST /sessions/{session_id}/upload` - 上传数据文件
- `GET /sessions/{session_id}/data/info` - 获取数据信息
- `GET /sessions/{session_id}/data/preview` - 数据预览

### 模型训练
- `POST /sessions/{session_id}/train` - 训练模型

### 系统管理
- `GET /health` - 健康检查
- `GET /system/cache/status` - 缓存状态
- `POST /system/cache/cleanup` - 清理过期缓存

## 🌐 WebSocket支持

```javascript
// 连接WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/{session_id}');

// 监听训练进度
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'training_progress') {
        console.log(`训练进度: ${data.progress * 100}%`);
    }
};
```

## 🛠️ 故障排除

### Redis连接失败
1. 检查Redis是否运行：`redis-cli ping`
2. 检查端口是否被占用：`lsof -i :6379`
3. 查看Redis日志：`redis-cli monitor`

### 内存使用过高
1. 检查缓存状态：`GET /system/cache/status`
2. 清理过期数据：`POST /system/cache/cleanup`
3. 调整TTL设置：修改`REDIS_DEFAULT_TTL`环境变量

### 性能优化
1. 增加Redis内存限制
2. 启用Redis持久化（可选）
3. 配置Redis集群（生产环境）

## 📈 监控和日志

### 查看Redis状态
```bash
redis-cli info memory
redis-cli info stats
```

### 查看应用日志
```bash
tail -f logs/ml_backend.log
```

## 🔒 安全建议

1. **生产环境**：设置Redis密码
2. **网络安全**：限制Redis访问IP
3. **数据加密**：敏感数据加密存储
4. **定期清理**：设置合理的TTL值

## 📞 技术支持

如遇问题，请检查：
1. Python版本 >= 3.8
2. Redis版本 >= 5.0
3. 依赖包版本兼容性
4. 系统防火墙设置 