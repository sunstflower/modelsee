"""
ML Layers Module - 机器学习层组件模块
提供丰富的神经网络层组件，支持TensorFlow和PyTorch
"""

from .base_layer import BaseLayer, LayerRegistry, LayerConfig, ValidationResult
from .basic_layers import *
from .advanced_layers import *
from .activation_layers import *
from .normalization_layers import *
from .regularization_layers import *
from .attention_layers import *
from .custom_layers import *

# 导出所有层类型

__all__ = [
    'BaseLayer',
    'LayerRegistry',
    'LayerConfig',
    'ValidationResult',
    'get_all_layers',
    'get_layer_by_type',
    'register_layer',
]

def get_all_layers():
    """获取所有已注册的层类型"""
    return LayerRegistry.get_all_layers()

def get_layer_by_type(layer_type: str):
    """根据类型获取层类"""
    return LayerRegistry.get_layer(layer_type)

def register_layer(layer_type: str, layer_class):
    """注册新的层类型"""
    return LayerRegistry.register(layer_type, layer_class) 