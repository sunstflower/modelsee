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
from types import SimpleNamespace
import numpy as np
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
        # 检查是否需要预先上传数据
        has_mnist = any(getattr(layer, 'type', '') == 'mnist' for layer in config.model_structure.layers)
        has_csv = any(getattr(layer, 'type', '') == 'useData' for layer in config.model_structure.layers)

        df = None
        if not (has_mnist or has_csv):
            # 需要上传的数据流（例如用户CSV）
            data_info = data_processor.get_data_info(session_id)
            if not data_info:
                raise HTTPException(status_code=400, detail="请先上传数据")
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
    """异步训练模型（TensorFlow 实训 + TensorBoard 日志）"""
    try:
        await manager.send_message(session_id, {
            "type": "training_status",
            "status": "started",
            "message": "开始训练模型"
        })
        
        # 数据源判断
        has_mnist = any(getattr(layer, 'type', '') == 'mnist' for layer in config.model_structure.layers)
        has_csv = any(getattr(layer, 'type', '') == 'useData' for layer in config.model_structure.layers)

        # 仅实现 TF 实训
        try:
            import tensorflow as tf
            from tensorflow.keras import layers, models
        except Exception as e:
            raise RuntimeError("后端未安装 TensorFlow，请安装 requirements_ml.txt 后重试") from e

        # ======== Keras 参数解析辅助 ========
        def _to_bool(val, default=None):
            if val is None:
                return default
            if isinstance(val, bool):
                return val
            if isinstance(val, str):
                return val.strip().lower() in ("true", "1", "yes", "y", "t")
            return bool(val)

        def _to_int(val, default=None):
            try:
                return int(val)
            except Exception:
                return default

        def _to_float(val, default=None):
            try:
                return float(val)
            except Exception:
                return default

        def _to_tuple2(val, default=None):
            if val is None:
                return default
            if isinstance(val, (list, tuple)):
                if len(val) == 1:
                    return (int(val[0]), int(val[0]))
                return (int(val[0]), int(val[1]))
            try:
                v = int(val)
                return (v, v)
            except Exception:
                return default

        def _resolve_activation(name):
            if not name:
                return None
            # 直接返回字符串，Keras 可解析常见名称
            return str(name)

        def _resolve_initializer(spec):
            if not spec:
                return None
            if isinstance(spec, str):
                name = spec.strip()
                mapping = {
                    'glorotUniform': tf.keras.initializers.GlorotUniform,
                    'glorotNormal': tf.keras.initializers.GlorotNormal,
                    'heUniform': tf.keras.initializers.HeUniform,
                    'heNormal': tf.keras.initializers.HeNormal,
                    'lecunUniform': tf.keras.initializers.LecunUniform,
                    'lecunNormal': tf.keras.initializers.LecunNormal,
                    'zeros': tf.keras.initializers.Zeros,
                    'ones': tf.keras.initializers.Ones,
                    'randomNormal': tf.keras.initializers.RandomNormal,
                    'randomUniform': tf.keras.initializers.RandomUniform,
                    'orthogonal': tf.keras.initializers.Orthogonal,
                    'varianceScaling': tf.keras.initializers.VarianceScaling,
                }
                ctor = mapping.get(name) or getattr(tf.keras.initializers, name, None)
                return ctor() if ctor else None
            if isinstance(spec, dict):
                t = spec.get('type') or spec.get('name')
                if not t:
                    return None
                return _resolve_initializer(t)
            return None

        def _resolve_regularizer(spec):
            if not spec:
                return None
            if isinstance(spec, str):
                if spec == 'l1':
                    return tf.keras.regularizers.L1(0.01)
                if spec == 'l2':
                    return tf.keras.regularizers.L2(0.01)
                if spec in ('l1l2', 'l1_l2'):
                    return tf.keras.regularizers.L1L2(l1=0.01, l2=0.01)
                # 允许直接传 Keras 识别的字符串
                try:
                    return getattr(tf.keras.regularizers, spec)()
                except Exception:
                    return None
            if isinstance(spec, dict):
                t = spec.get('type') or spec.get('name')
                if not t:
                    return None
                l1v = _to_float(spec.get('l1'))
                l2v = _to_float(spec.get('l2'))
                if t == 'l1':
                    return tf.keras.regularizers.L1(l1v or 0.0)
                if t == 'l2':
                    return tf.keras.regularizers.L2(l2v or 0.0)
                if t in ('l1l2', 'l1_l2'):
                    return tf.keras.regularizers.L1L2(l1=l1v or 0.0, l2=l2v or 0.0)
            return None

        def _resolve_constraint(spec):
            if not spec:
                return None
            if isinstance(spec, str):
                try:
                    return getattr(tf.keras.constraints, spec)()
                except Exception:
                    return None
            if isinstance(spec, dict):
                t = spec.get('type') or spec.get('name')
                if not t:
                    return None
                if t == 'maxNorm':
                    max_value = _to_float(spec.get('maxValue'), 2.0)
                    axis = _to_int(spec.get('axis'), 0)
                    return tf.keras.constraints.MaxNorm(max_value=max_value, axis=axis)
                if t == 'unitNorm':
                    axis = _to_int(spec.get('axis'), 0)
                    return tf.keras.constraints.UnitNorm(axis=axis)
                if t == 'nonNeg':
                    return tf.keras.constraints.NonNeg()
            return None

        # TensorBoard 日志（包含图、直方图、profile trace）
        logdir = os.path.join("runs", session_id, datetime.now().strftime("%Y%m%d-%H%M%S"))
        os.makedirs(logdir, exist_ok=True)
        tb_callback = tf.keras.callbacks.TensorBoard(
            log_dir=logdir,
            histogram_freq=1,
            write_graph=True,
            write_images=False,
            update_freq='batch',
            profile_batch='2,5'  # 对第2到5个batch做性能trace
        )

        # 解析结构并构建模型（覆盖常用层）
        def _parse_shape(val):
            if isinstance(val, (list, tuple)):
                return list(val)
            if isinstance(val, str):
                s = val.replace('(', '').replace(')', '')
                parts = [p.strip() for p in s.split(',') if p.strip()]
                out = []
                for p in parts:
                    if p.lower() in ("none", "null"):
                        out.append(None)
                    else:
                        try:
                            out.append(int(p))
                        except Exception:
                            out.append(None)
                return out
            return None

        proc_layers = [l for l in config.model_structure.layers if l.type not in ("mnist", "useData")]
        model = models.Sequential()
        first = True
        feature_dim = None
        if has_csv and df is not None:
            feature_dim = df.shape[1] - 1 if df.shape[1] > 1 else 1

        for l in proc_layers:
            t = l.type
            cfg = l.config or {}
            if t == 'conv2d':
                filters = _to_int(cfg.get('filters'), 32)
                ks = cfg.get('kernelSize') or cfg.get('kernel_size') or 3
                kernel_size = _to_tuple2(ks, (3, 3))
                strides = _to_tuple2(cfg.get('strides'), (1, 1))
                padding = str(cfg.get('padding', 'valid')).lower()
                use_bias = _to_bool(cfg.get('useBias') if 'useBias' in cfg else cfg.get('use_bias'), True)
                dilation_rate = _to_tuple2(cfg.get('dilationRate') if 'dilationRate' in cfg else cfg.get('dilation_rate'), (1, 1))
                activation = _resolve_activation(cfg.get('activation', 'relu'))
                k_init = _resolve_initializer(cfg.get('kernelInitializer') or cfg.get('kernel_initializer'))
                b_init = _resolve_initializer(cfg.get('biasInitializer') or cfg.get('bias_initializer'))
                k_reg = _resolve_regularizer(cfg.get('kernelRegularizer') or cfg.get('kernel_regularizer'))
                b_reg = _resolve_regularizer(cfg.get('biasRegularizer') or cfg.get('bias_regularizer'))
                a_reg = _resolve_regularizer(cfg.get('activityRegularizer') or cfg.get('activity_regularizer'))
                k_con = _resolve_constraint(cfg.get('kernelConstraint') or cfg.get('kernel_constraint'))
                b_con = _resolve_constraint(cfg.get('biasConstraint') or cfg.get('bias_constraint'))
                kwargs = {
                    'filters': filters,
                    'kernel_size': kernel_size,
                    'strides': strides,
                    'padding': padding,
                    'dilation_rate': dilation_rate,
                    'activation': activation,
                    'use_bias': use_bias,
                    'kernel_initializer': k_init,
                    'bias_initializer': b_init,
                    'kernel_regularizer': k_reg,
                    'bias_regularizer': b_reg,
                    'activity_regularizer': a_reg,
                    'kernel_constraint': k_con,
                    'bias_constraint': b_con,
                    'name': cfg.get('name'),
                }
                if first:
                    if has_mnist:
                        kwargs['input_shape'] = (28, 28, 1)
                        model.add(layers.Conv2D(**{k: v for k, v in kwargs.items() if v is not None}))
                    else:
                        raise RuntimeError('CSV 数据不支持 Conv2D 作为第一层')
                else:
                    model.add(layers.Conv2D(**{k: v for k, v in kwargs.items() if v is not None}))
            elif t == 'maxPooling2d':
                pool = _to_tuple2(cfg.get('poolSize') or cfg.get('pool_size'), (2, 2))
                strides = _to_tuple2(cfg.get('strides'), pool)
                padding = str(cfg.get('padding', 'valid')).lower()
                model.add(layers.MaxPooling2D(pool_size=pool, strides=strides, padding=padding))
            elif t == 'avgPooling2d':
                pool = _to_tuple2(cfg.get('poolSize') or cfg.get('pool_size'), (2, 2))
                strides = _to_tuple2(cfg.get('strides'), pool)
                padding = str(cfg.get('padding', 'valid')).lower()
                model.add(layers.AveragePooling2D(pool_size=pool, strides=strides, padding=padding))
            elif t == 'flatten':
                model.add(layers.Flatten())
            elif t == 'dense':
                units = _to_int(cfg.get('units'), 128)
                activation = _resolve_activation(cfg.get('activation', 'relu'))
                use_bias = _to_bool(cfg.get('useBias') if 'useBias' in cfg else cfg.get('use_bias'), True)
                k_init = _resolve_initializer(cfg.get('kernelInitializer') or cfg.get('kernel_initializer'))
                b_init = _resolve_initializer(cfg.get('biasInitializer') or cfg.get('bias_initializer'))
                k_reg = _resolve_regularizer(cfg.get('kernelRegularizer') or cfg.get('kernel_regularizer'))
                b_reg = _resolve_regularizer(cfg.get('biasRegularizer') or cfg.get('bias_regularizer'))
                a_reg = _resolve_regularizer(cfg.get('activityRegularizer') or cfg.get('activity_regularizer'))
                k_con = _resolve_constraint(cfg.get('kernelConstraint') or cfg.get('kernel_constraint'))
                b_con = _resolve_constraint(cfg.get('biasConstraint') or cfg.get('bias_constraint'))
                kwargs = {
                    'units': units,
                    'activation': activation,
                    'use_bias': use_bias,
                    'kernel_initializer': k_init,
                    'bias_initializer': b_init,
                    'kernel_regularizer': k_reg,
                    'bias_regularizer': b_reg,
                    'activity_regularizer': a_reg,
                    'kernel_constraint': k_con,
                    'bias_constraint': b_con,
                    'name': cfg.get('name'),
                }
                if first:
                    if has_mnist:
                        model.add(layers.Flatten(input_shape=(28, 28, 1)))
                        model.add(layers.Dense(**{k: v for k, v in kwargs.items() if v is not None}))
                    else:
                        if feature_dim is None:
                            feature_dim = 4
                        model.add(layers.Dense(**{k: v for k, v in {**kwargs, 'input_dim': int(feature_dim)}.items() if v is not None}))
                else:
                    model.add(layers.Dense(**{k: v for k, v in kwargs.items() if v is not None}))
            elif t == 'dropout':
                rate = _to_float(cfg.get('rate'), 0.5)
                model.add(layers.Dropout(rate))
            elif t == 'batchNorm':
                momentum = _to_float(cfg.get('momentum'), 0.99)
                epsilon = _to_float(cfg.get('epsilon'), 0.001)
                center = _to_bool(cfg.get('center'), True)
                scale = _to_bool(cfg.get('scale'), True)
                axis = _to_int(cfg.get('axis'), -1)
                beta_init = _resolve_initializer(cfg.get('betaInitializer') or cfg.get('beta_initializer'))
                gamma_init = _resolve_initializer(cfg.get('gammaInitializer') or cfg.get('gamma_initializer'))
                model.add(layers.BatchNormalization(momentum=momentum, epsilon=epsilon, center=center, scale=scale, axis=axis,
                                                    beta_initializer=beta_init, gamma_initializer=gamma_init))
            elif t == 'lstm':
                units = _to_int(cfg.get('units'), 128)
                return_sequences = _to_bool(cfg.get('returnSequences') if 'returnSequences' in cfg else cfg.get('return_sequences'), False)
                act = _resolve_activation(cfg.get('activation', 'tanh'))
                ract = _resolve_activation(cfg.get('recurrentActivation') or cfg.get('recurrent_activation') or 'sigmoid')
                use_bias = _to_bool(cfg.get('useBias') if 'useBias' in cfg else cfg.get('use_bias'), True)
                dropout = _to_float(cfg.get('dropout'), 0.0)
                rdrop = _to_float(cfg.get('recurrentDropout') if 'recurrentDropout' in cfg else cfg.get('recurrent_dropout'), 0.0)
                kwargs = {
                    'units': units,
                    'return_sequences': return_sequences,
                    'activation': act,
                    'recurrent_activation': ract,
                    'use_bias': use_bias,
                    'dropout': dropout,
                    'recurrent_dropout': rdrop,
                    'name': cfg.get('name'),
                }
                if first:
                    steps = None
                    feats = feature_dim if feature_dim is not None else 28
                    kwargs['input_shape'] = (steps, int(feats))
                    model.add(layers.LSTM(**{k: v for k, v in kwargs.items() if v is not None}))
                else:
                    model.add(layers.LSTM(**{k: v for k, v in kwargs.items() if v is not None}))
            elif t == 'gru':
                units = _to_int(cfg.get('units'), 128)
                return_sequences = _to_bool(cfg.get('returnSequences') if 'returnSequences' in cfg else cfg.get('return_sequences'), False)
                act = _resolve_activation(cfg.get('activation', 'tanh'))
                ract = _resolve_activation(cfg.get('recurrentActivation') or cfg.get('recurrent_activation') or 'sigmoid')
                use_bias = _to_bool(cfg.get('useBias') if 'useBias' in cfg else cfg.get('use_bias'), True)
                dropout = _to_float(cfg.get('dropout'), 0.0)
                rdrop = _to_float(cfg.get('recurrentDropout') if 'recurrentDropout' in cfg else cfg.get('recurrent_dropout'), 0.0)
                kwargs = {
                    'units': units,
                    'return_sequences': return_sequences,
                    'activation': act,
                    'recurrent_activation': ract,
                    'use_bias': use_bias,
                    'dropout': dropout,
                    'recurrent_dropout': rdrop,
                    'name': cfg.get('name'),
                }
                if first:
                    steps = None
                    feats = feature_dim if feature_dim is not None else 28
                    kwargs['input_shape'] = (steps, int(feats))
                    model.add(layers.GRU(**{k: v for k, v in kwargs.items() if v is not None}))
                else:
                    model.add(layers.GRU(**{k: v for k, v in kwargs.items() if v is not None}))
            elif t == 'activation':
                activation = _resolve_activation(cfg.get('activation', 'relu'))
                model.add(layers.Activation(activation))
            elif t == 'reshape':
                target = _parse_shape(cfg.get('targetShape'))
                if first:
                    if has_mnist:
                        model.add(layers.Reshape(tuple(target or [28, 28, 1]), input_shape=(28, 28, 1)))
                    else:
                        if feature_dim is None:
                            feature_dim = 4
                        model.add(layers.Reshape(tuple(target or [1, int(feature_dim)]), input_shape=(int(feature_dim),)))
                else:
                    model.add(layers.Reshape(tuple(target or [1, int(feature_dim or 4)])))
            else:
                logger.warning(f"未支持的层类型: {t}")

            if first:
                first = False

        # 数据
        if has_mnist:
            (x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
            x_train = x_train.astype('float32') / 255.0
            x_test = x_test.astype('float32') / 255.0
            x_train = np.expand_dims(x_train, -1)
            x_test = np.expand_dims(x_test, -1)
            y_train = tf.keras.utils.to_categorical(y_train, 10)
            y_test = tf.keras.utils.to_categorical(y_test, 10)
        elif has_csv and df is not None:
            data_np = df.values
            X = data_np[:, :-1]
            y_raw = data_np[:, -1]
            classes = np.unique(y_raw)
            class_to_idx = {c: i for i, c in enumerate(classes)}
            y_idx = np.vectorize(lambda v: class_to_idx.get(v, 0))(y_raw)
            num_classes = max(len(classes), 2)
            y_cat = tf.keras.utils.to_categorical(y_idx, num_classes)
            n = X.shape[0]
            split = int(n * 0.8)
            x_train, x_test = X[:split].astype('float32'), X[split:].astype('float32')
            y_train, y_test = y_cat[:split], y_cat[split:]
        else:
            raise RuntimeError('未检测到数据源节点，或数据不可用')

        # 自动补齐输出层并编译
        if has_mnist:
            num_classes = 10
        elif has_csv and df is not None:
            # 对于CSV，使用已构造的y_train推断类别数
            num_classes = int(y_train.shape[1]) if hasattr(y_train, 'shape') and len(y_train.shape) == 2 else None
        else:
            num_classes = None

        if num_classes is not None:
            last_layer = model.layers[-1] if model.layers else None
            need_output_layer = True
            if last_layer and isinstance(last_layer, layers.Dense) and getattr(last_layer, 'units', None) == num_classes:
                need_output_layer = False
            if need_output_layer:
                last_name = last_layer.__class__.__name__.lower() if last_layer else ''
                if has_mnist and last_name in ('conv2d', 'maxpooling2d', 'averagepooling2d'):
                    model.add(layers.Flatten())
                model.add(layers.Dense(num_classes, activation='softmax'))

        lr = float(config.training_params.get('learning_rate', 0.001))
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=lr),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )

        epochs = int(config.training_params.get('epochs', 10))
        batch_size = int(config.training_params.get('batch_size', 32))

        loop = asyncio.get_running_loop()

        def _fit():
            return model.fit(
                x_train,
                y_train,
                validation_data=(x_test, y_test),
                epochs=epochs,
                batch_size=batch_size,
                callbacks=[tb_callback],
                verbose=1
            )

        await loop.run_in_executor(None, _fit)

        await manager.send_message(session_id, {
            "type": "training_status",
            "status": "completed",
            "message": "模型训练完成（TensorBoard 可查看）",
            "tensorboard_logdir": logdir
        })
        logger.info(f"模型训练完成: {session_id}, 日志目录: {logdir}")
        
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