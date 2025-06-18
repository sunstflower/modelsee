# Visual ML Model Builder - Backend

基于FastAPI的机器学习模型构建后端，支持TensorFlow和PyTorch框架。

## 功能特性

- 🔧 **多框架支持**: 同时支持TensorFlow和PyTorch
- 🚀 **异步训练**: 支持异步模型训练和实时进度反馈
- 🔄 **实时通信**: WebSocket支持实时训练状态更新
- 📊 **模型管理**: 完整的会话管理和模型生命周期
- 📤 **模型导出**: 支持多种格式的模型导出
- 🎯 **RESTful API**: 完整的REST API接口

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements_ml.txt
```

### 2. 启动服务器

```bash
# 使用启动脚本（推荐）
python start_ml_backend.py

# 或直接启动
uvicorn ml_backend:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 访问API文档

- 服务器地址: http://localhost:8000
- API文档: http://localhost:8000/docs
- 交互式文档: http://localhost:8000/redoc

## API 端点

### 模型管理
- `POST /api/models/create` - 创建模型
- `POST /api/models/train` - 训练模型
- `POST /api/models/predict` - 模型推理
- `GET /api/models/export/{session_id}` - 导出模型

### 会话管理
- `GET /api/sessions/{session_id}` - 获取会话信息
- `DELETE /api/sessions/{session_id}` - 删除会话

### 实时通信
- `WebSocket /ws/{session_id}` - 实时训练进度

## 架构说明

### 核心组件

1. **ml_backend.py** - FastAPI主应用
2. **ml_session_manager.py** - 会话管理器
3. **ml_converters/** - 模型转换器
   - `tensorflow_converter.py` - TensorFlow转换器
   - `pytorch_converter.py` - PyTorch转换器

### 数据流

```
前端可视化界面 → API请求 → 模型转换器 → 训练执行 → 实时反馈 → 前端更新
```

## 支持的层类型

- **卷积层**: Conv2D, MaxPooling2D, AvgPooling2D
- **全连接层**: Dense, Dropout
- **规范化层**: BatchNormalization
- **循环层**: LSTM, GRU
- **工具层**: Flatten, Activation, Reshape

## 开发指南

### 添加新的层类型

1. 在转换器中添加层创建方法
2. 更新 `supported_layers` 字典
3. 实现代码生成逻辑

### 扩展框架支持

1. 创建新的转换器类
2. 实现必要的接口方法
3. 在主应用中注册转换器

## 环境要求

- Python 3.8+
- TensorFlow 2.15+ (可选)
- PyTorch 2.1+ (可选)
- FastAPI 0.104+

## 许可证

MIT License 