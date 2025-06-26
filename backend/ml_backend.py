#!/usr/bin/env python3
"""
机器学习后端 - 集成Redis临时缓存
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import logging
import asyncio
import json
import uuid
from datetime import datetime
import os
import sys

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 导入自定义模块
from data.temp_processor import TempDataProcessor
from cache.redis_client import get_redis_cache
from ml_session_manager import MLSessionManager
from ml_converters.tensorflow_converter import TensorFlowConverter
from ml_converters.pytorch_converter import PyTorchConverter
from ml_model_builder import model_builder

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title="ML Visual Builder Backend",
    description="机器学习可视化构建器后端 - 支持Redis临时缓存",
    version="2.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"  # 开发环境允许所有源
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 全局实例
redis_cache = get_redis_cache()
data_processor = TempDataProcessor()
session_manager = MLSessionManager()
tf_converter = TensorFlowConverter()
pytorch_converter = PyTorchConverter()

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
                logger.error(f"发送WebSocket消息失败: {e}")
                self.disconnect(session_id)

manager = ConnectionManager()

# ==================== 数据模型 ====================

class SessionCreate(BaseModel):
    session_name: Optional[str] = None
    description: Optional[str] = None

class ProcessingConfig(BaseModel):
    steps: List[Dict[str, Any]]

class LayerConfig(BaseModel):
    type: str
    config: Dict[str, Any]
    id: str
    position: Optional[Dict[str, float]] = None

class ModelStructure(BaseModel):
    layers: List[LayerConfig]
    connections: List[Dict[str, str]]
    framework: str = "tensorflow"

class TrainingConfig(BaseModel):
    model_structure: ModelStructure
    training_params: Dict[str, Any]
    framework: str = "tensorflow"

# ==================== API路由 ====================

@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "ML Visual Builder Backend",
        "version": "2.0.0",
        "features": ["Redis缓存", "临时数据处理", "WebSocket实时通信"],
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """健康检查"""
    try:
        # 检查Redis连接
        redis_status = "connected" if redis_cache._is_redis_available() else "memory_fallback"
        
        # 获取缓存使用情况
        cache_info = redis_cache.get_memory_usage()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "redis_status": redis_status,
            "cache_info": cache_info,
            "active_sessions": len(redis_cache.get_all_active_sessions())
        }
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        raise HTTPException(status_code=500, detail="服务不健康")

# ==================== 会话管理 ====================

@app.post("/sessions")
async def create_session(session_data: SessionCreate):
    """创建新会话"""
    try:
        session_id = str(uuid.uuid4())
        
        # 创建会话信息
        session_info = {
            'session_id': session_id,
            'session_name': session_data.session_name or f"Session_{session_id[:8]}",
            'description': session_data.description or "",
            'created_at': datetime.now().isoformat(),
            'status': 'active',
            'has_data': False
        }
        
        # 存储会话信息
        success = redis_cache.store_session_info(session_id, session_info)
        if not success:
            raise HTTPException(status_code=500, detail="创建会话失败")
        
        logger.info(f"创建新会话: {session_id}")
        
        return {
            "success": True,
            "session_id": session_id,
            "session_info": session_info
        }
        
    except Exception as e:
        logger.error(f"创建会话失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """获取会话信息"""
    try:
        session_info = redis_cache.get_session_info(session_id)
        if not session_info:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        # 更新最后访问时间
        redis_cache.update_session_access(session_id)
        
        return {
            "success": True,
            "session_info": session_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取会话失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions")
async def list_sessions():
    """获取所有活跃会话"""
    try:
        session_ids = redis_cache.get_all_active_sessions()
        sessions = []
        
        for session_id in session_ids:
            session_info = redis_cache.get_session_info(session_id)
            if session_info:
                sessions.append(session_info)
        
        return {
            "success": True,
            "sessions": sessions,
            "total": len(sessions)
        }
        
    except Exception as e:
        logger.error(f"获取会话列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """删除会话"""
    try:
        # 清理会话数据
        success = redis_cache.clear_session_data(session_id)
        
        # 断开WebSocket连接
        manager.disconnect(session_id)
        
        logger.info(f"删除会话: {session_id}")
        
        return {
            "success": success,
            "message": "会话已删除"
        }
        
    except Exception as e:
        logger.error(f"删除会话失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 数据处理 ====================

@app.post("/sessions/{session_id}/upload")
async def upload_data(session_id: str, file: UploadFile = File(...)):
    """上传数据文件"""
    try:
        # 检查会话是否存在
        session_info = redis_cache.get_session_info(session_id)
        if not session_info:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        # 处理文件
        result = await data_processor.upload_and_process(session_id, file)
        
        # 通过WebSocket发送进度更新
        await manager.send_message(session_id, {
            "type": "data_upload",
            "status": "completed" if result['success'] else "failed",
            "result": result
        })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"上传数据失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/{session_id}/data/info")
async def get_data_info(session_id: str):
    """获取数据信息"""
    try:
        data_info = data_processor.get_data_info(session_id)
        if not data_info:
            raise HTTPException(status_code=404, detail="未找到数据")
        
        return {
            "success": True,
            "data_info": data_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取数据信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/{session_id}/data/preview")
async def get_data_preview(session_id: str, data_type: str = "raw_data"):
    """获取数据预览"""
    try:
        preview = data_processor.get_data_preview(session_id, data_type)
        if not preview:
            raise HTTPException(status_code=404, detail="未找到数据")
        
        return {
            "success": True,
            "preview": preview,
            "data_type": data_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取数据预览失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 模型训练 ====================

@app.post("/sessions/{session_id}/train")
async def train_model(session_id: str, config: TrainingConfig):
    """训练模型"""
    try:
        # 检查数据是否存在
        data_info = data_processor.get_data_info(session_id)
        if not data_info:
            raise HTTPException(status_code=400, detail="请先上传数据")
        
        # 获取训练数据
        df = redis_cache.get_dataframe(session_id, "raw_data")
        if df is None:
            raise HTTPException(status_code=400, detail="未找到训练数据")
        
        # 根据框架选择转换器
        if config.framework.lower() == "tensorflow":
            converter = tf_converter
        elif config.framework.lower() == "pytorch":
            converter = pytorch_converter
        else:
            raise HTTPException(status_code=400, detail="不支持的框架")
        
        # 开始训练（异步）
        asyncio.create_task(
            _train_model_async(session_id, df, config, converter)
        )
        
        return {
            "success": True,
            "message": "开始训练模型",
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"训练模型失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _train_model_async(session_id: str, df, config: TrainingConfig, converter):
    """异步训练模型"""
    try:
        # 发送训练开始消息
        await manager.send_message(session_id, {
            "type": "training_status",
            "status": "started",
            "message": "开始训练模型"
        })
        
        # 模拟训练过程
        for epoch in range(1, 11):
            await asyncio.sleep(1)  # 模拟训练时间
            
            # 发送训练进度
            await manager.send_message(session_id, {
                "type": "training_progress",
                "epoch": epoch,
                "total_epochs": 10,
                "progress": epoch / 10,
                "loss": 1.0 - (epoch * 0.08),  # 模拟损失下降
                "accuracy": 0.5 + (epoch * 0.04)  # 模拟准确率提升
            })
        
        # 训练完成
        await manager.send_message(session_id, {
            "type": "training_status",
            "status": "completed",
            "message": "模型训练完成",
            "final_metrics": {
                "loss": 0.2,
                "accuracy": 0.9
            }
        })
        
        logger.info(f"模型训练完成: {session_id}")
        
    except Exception as e:
        logger.error(f"异步训练失败: {e}")
        await manager.send_message(session_id, {
            "type": "training_status",
            "status": "failed",
            "message": f"训练失败: {str(e)}"
        })

# ==================== WebSocket ====================

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket连接端点"""
    await manager.connect(websocket, session_id)
    
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理客户端消息
            if message.get("type") == "ping":
                await manager.send_message(session_id, {
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
            
    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        logger.error(f"WebSocket错误: {e}")
        manager.disconnect(session_id)

# ==================== 系统管理 ====================

@app.get("/system/cache/status")
async def get_cache_status():
    """获取缓存状态"""
    try:
        return {
            "success": True,
            "cache_status": redis_cache.get_memory_usage(),
            "active_sessions": redis_cache.get_all_active_sessions()
        }
    except Exception as e:
        logger.error(f"获取缓存状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/system/cache/cleanup")
async def cleanup_cache():
    """清理过期缓存"""
    try:
        cleaned_count = redis_cache.cleanup_expired_sessions()
        return {
            "success": True,
            "cleaned_sessions": cleaned_count,
            "message": f"清理了 {cleaned_count} 个过期会话"
        }
    except Exception as e:
        logger.error(f"清理缓存失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 新增层组件API ====================

@app.get("/layers")
async def get_available_layers():
    """获取所有可用的层组件"""
    try:
        layers_info = model_builder.get_available_layers()
        return {
            "success": True,
            "layers": layers_info
        }
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        logger.error(f"获取层信息失败: {e}\n{error_detail}")
        raise HTTPException(status_code=500, detail=f"获取层信息失败: {str(e)}")

@app.get("/layers/{layer_type}")
async def get_layer_info(layer_type: str):
    """获取特定层的详细信息"""
    try:
        layer_info = model_builder.get_layer_info(layer_type)
        if not layer_info:
            raise HTTPException(status_code=404, detail=f"层类型 '{layer_type}' 不存在")
        
        return {
            "success": True,
            "layer_info": layer_info
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取层信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ModelConfig(BaseModel):
    name: Optional[str] = "CustomModel"
    input_shape: Optional[List[int]] = None
    layers: List[Dict[str, Any]]
    framework: str = "tensorflow"

@app.post("/models/validate")
async def validate_model(config: ModelConfig):
    """验证模型配置"""
    try:
        model_config = config.dict()
        validation_result = model_builder.validate_model_config(model_config)
        
        return {
            "success": True,
            "validation": {
                "is_valid": validation_result.is_valid,
                "errors": validation_result.errors,
                "warnings": validation_result.warnings,
                "suggestions": validation_result.suggestions
            }
        }
    except Exception as e:
        logger.error(f"模型验证失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/build/tensorflow")
async def build_tensorflow_model(config: ModelConfig):
    """构建TensorFlow模型代码"""
    try:
        model_config = config.dict()
        result = model_builder.build_tensorflow_model(model_config)
        
        if not result['success']:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "errors": result.get('errors', []),
                    "warnings": result.get('warnings', [])
                }
            )
        
        return {
            "success": True,
            "code": result['code'],
            "warnings": result.get('warnings', []),
            "suggestions": result.get('suggestions', [])
        }
        
    except Exception as e:
        logger.error(f"TensorFlow模型构建失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/build/pytorch")
async def build_pytorch_model(config: ModelConfig):
    """构建PyTorch模型代码"""
    try:
        model_config = config.dict()
        result = model_builder.build_pytorch_model(model_config)
        
        if not result['success']:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "errors": result.get('errors', []),
                    "warnings": result.get('warnings', [])
                }
            )
        
        return {
            "success": True,
            "code": result['code'],
            "warnings": result.get('warnings', []),
            "suggestions": result.get('suggestions', [])
        }
        
    except Exception as e:
        logger.error(f"PyTorch模型构建失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/analyze")
async def analyze_model_complexity(config: ModelConfig):
    """分析模型复杂度"""
    try:
        model_config = config.dict()
        result = model_builder.analyze_model_complexity(model_config)
        
        if not result['success']:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "errors": result.get('errors', [])
                }
            )
        
        return {
            "success": True,
            "analysis": result['analysis']
        }
        
    except Exception as e:
        logger.error(f"模型复杂度分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 错误处理 ====================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """全局异常处理"""
    import traceback
    error_detail = traceback.format_exc()
    logger.error(f"未处理的异常: {exc}\n{error_detail}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "内部服务器错误",
            "message": [str(exc), error_detail]
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "ml_backend:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 