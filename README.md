
# ModelSee - 可视化机器学习模型构建器

一个基于 React + FastAPI 的可视化机器学习模型构建和训练平台，支持拖拽式模型设计、实时训练和 TensorBoard 可视化。

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/<your-username>/modelsee.git
cd modelsee
```

### 2. 设置统一Python虚拟环境（Python 3.12）

```bash
# 创建虚拟环境（如果不存在）
python3.12 -m venv .venv

# 激活虚拟环境
source .venv/bin/activate

# 安装Python依赖
pip install -r backend/requirements_layers.txt
pip install -r backend/requirements_ml.txt
pip install redis hiredis chardet
```

### 3. 启动后端服务

```bash
# 确保在项目根目录且虚拟环境已激活
source .venv/bin/activate
cd backend
python -m uvicorn ml_backend:app --host 127.0.0.1 --port 8000 --reload
```

### 4. 启动Node代理服务（TensorBoard支持）

```bash
# 新终端窗口
cd backend
npm install
npm run start
```

### 5. 启动前端开发服务器

```bash
# 新终端窗口
cd modelsee
npm install
npm run dev
```

### 6. 启动 TensorBoard（端口 6006）

```bash
# 新终端窗口，确保虚拟环境已激活
source .venv/bin/activate
tensorboard --logdir backend/runs --port 6006 --host 127.0.0.1
```



- **前端**: http://localhost:5173 或 http://localhost:5174
- **后端API**: http://localhost:8000
- **Node代理**: http://localhost:5001
- **TensorBoard**: http://localhost:6006
