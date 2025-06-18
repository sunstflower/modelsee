#!/usr/bin/env python3
"""
ML Backend for Visual Model Builder
支持TensorFlow和PyTorch的模型创建、训练和推理
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import asyncio
import logging
import uuid
from datetime import datetime
import os
import sys

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 导入模型转换器
from ml_converters.tensorflow_converter import TensorFlowConverter
from ml_converters.pytorch_converter import PyTorchConverter
from ml_session_manager import MLSessionManager

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Visual ML Model Builder API",
    description="后端API for visual machine learning model building",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # 前端地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局会话管理器
session_manager = MLSessionManager()

# 数据模型定义
class LayerConfig(BaseModel):
    type: str
    config: Dict[str, Any]
    id: str
    position: Optional[Dict[str, float]] = None

class ModelStructure(BaseModel):
    layers: List[LayerConfig]
    connections: List[Dict[str, str]]
    framework: str = "tensorflow"  # tensorflow 或 pytorch
    
class TrainingConfig(BaseModel):
    epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 0.001
    optimizer: str = "adam"
    loss_function: str = "categorical_crossentropy"
    
class ModelRequest(BaseModel):
    model_structure: ModelStructure
    training_config: Optional[TrainingConfig] = None
    session_id: Optional[str] = None

class PredictionRequest(BaseModel):
    session_id: str
    data: List[List[float]]

# WebSocket连接管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket连接建立: {session_id}")

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket连接断开: {session_id}")

    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"发送消息失败: {e}")
                self.disconnect(session_id)

manager = ConnectionManager()

# API端点
@app.get("/")
async def root():
    return {"message": "Visual ML Model Builder API", "status": "running"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.post("/api/models/create")
async def create_model(request: ModelRequest):
    """创建模型并生成代码"""
    try:
        # 创建或获取会话
        session_id = request.session_id or str(uuid.uuid4())
        session = session_manager.get_or_create_session(session_id)
        
        # 选择转换器
        if request.model_structure.framework.lower() == "pytorch":
            converter = PyTorchConverter()
        else:
            converter = TensorFlowConverter()
        
        # 转换模型结构
        model_code = converter.convert_model_structure(
            request.model_structure.layers,
            request.model_structure.connections
        )
        
        # 保存到会话
        session.model_structure = request.model_structure
        session.model_code = model_code
        session.framework = request.model_structure.framework
        
        return {
            "success": True,
            "session_id": session_id,
            "model_code": model_code,
            "framework": request.model_structure.framework,
            "layer_count": len(request.model_structure.layers)
        }
        
    except Exception as e:
        logger.error(f"模型创建失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/models/train")
async def train_model(request: ModelRequest):
    """训练模型"""
    try:
        session_id = request.session_id
        if not session_id:
            raise HTTPException(status_code=400, detail="需要提供session_id")
            
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        # 选择转换器
        if session.framework.lower() == "pytorch":
            converter = PyTorchConverter()
        else:
            converter = TensorFlowConverter()
        
        # 开始训练（异步）
        training_config = request.training_config or TrainingConfig()
        
        # 在后台启动训练任务
        asyncio.create_task(
            converter.train_model_async(
                session, 
                training_config, 
                progress_callback=lambda progress: asyncio.create_task(
                    manager.send_message(session_id, {
                        "type": "training_progress",
                        "progress": progress
                    })
                )
            )
        )
        
        return {
            "success": True,
            "message": "训练已开始",
            "session_id": session_id
        }
        
    except Exception as e:
        logger.error(f"训练启动失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/models/predict")
async def predict(request: PredictionRequest):
    """模型推理"""
    try:
        session = session_manager.get_session(request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
            
        if not session.trained_model:
            raise HTTPException(status_code=400, detail="模型尚未训练")
        
        # 选择转换器
        if session.framework.lower() == "pytorch":
            converter = PyTorchConverter()
        else:
            converter = TensorFlowConverter()
            
        # 执行推理
        predictions = converter.predict(session.trained_model, request.data)
        
        return {
            "success": True,
            "predictions": predictions,
            "input_shape": [len(request.data), len(request.data[0]) if request.data else 0]
        }
        
    except Exception as e:
        logger.error(f"推理失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models/export/{session_id}")
async def export_model(session_id: str, format: str = "onnx"):
    """导出模型"""
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
            
        if not session.trained_model:
            raise HTTPException(status_code=400, detail="模型尚未训练")
        
        # 选择转换器
        if session.framework.lower() == "pytorch":
            converter = PyTorchConverter()
        else:
            converter = TensorFlowConverter()
            
        # 导出模型
        export_path = converter.export_model(session.trained_model, format)
        
        return {
            "success": True,
            "export_path": export_path,
            "format": format
        }
        
    except Exception as e:
        logger.error(f"模型导出失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket端点用于实时通信"""
    await manager.connect(websocket, session_id)
    try:
        while True:
            # 保持连接活跃
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理客户端消息
            if message.get("type") == "ping":
                await manager.send_message(session_id, {"type": "pong"})
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)

@app.get("/api/sessions/{session_id}")
async def get_session_info(session_id: str):
    """获取会话信息"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
        
    return {
        "session_id": session_id,
        "framework": session.framework,
        "model_created": session.model_code is not None,
        "model_trained": session.trained_model is not None,
        "created_at": session.created_at.isoformat(),
        "last_accessed": session.last_accessed.isoformat()
    }

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """删除会话"""
    success = session_manager.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="会话不存在")
        
    return {"success": True, "message": "会话已删除"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info") 