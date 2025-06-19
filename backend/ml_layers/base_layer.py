"""
基础层类定义和注册系统
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple, Union
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class FrameworkType(Enum):
    """支持的框架类型"""
    TENSORFLOW = "tensorflow"
    PYTORCH = "pytorch"

class DataType(Enum):
    """数据类型"""
    FLOAT32 = "float32"
    FLOAT64 = "float64"
    INT32 = "int32"
    INT64 = "int64"

@dataclass
class LayerConfig:
    """层配置数据类"""
    layer_type: str
    layer_id: str
    parameters: Dict[str, Any]
    input_shape: Optional[Tuple[int, ...]] = None
    output_shape: Optional[Tuple[int, ...]] = None
    trainable: bool = True
    name: Optional[str] = None

@dataclass
class ValidationResult:
    """验证结果"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    suggestions: List[str]

class BaseLayer(ABC):
    """所有层的基础类"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        self.layer_type = layer_type
        self.category = category
        self.description = description
        self.supported_frameworks = [FrameworkType.TENSORFLOW, FrameworkType.PYTORCH]
        self.required_params = []
        self.optional_params = {}
        self.param_constraints = {}
        
    @abstractmethod
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        """验证层配置"""
        pass
    
    @abstractmethod
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        """计算输出形状"""
        pass
    
    @abstractmethod
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        """生成TensorFlow代码"""
        pass
    
    @abstractmethod
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        """生成PyTorch代码，返回{'definition': str, 'forward': str}"""
        pass
    
    def get_parameter_info(self) -> Dict[str, Any]:
        """获取参数信息"""
        return {
            'required': self.required_params,
            'optional': self.optional_params,
            'constraints': self.param_constraints
        }
    
    def validate_parameters(self, params: Dict[str, Any]) -> ValidationResult:
        """验证参数"""
        errors = []
        warnings = []
        suggestions = []
        
        # 检查必需参数
        for param in self.required_params:
            if param not in params:
                errors.append(f"缺少必需参数: {param}")
        
        # 检查参数约束
        for param, value in params.items():
            if param in self.param_constraints:
                constraint = self.param_constraints[param]
                if not self._check_constraint(value, constraint):
                    errors.append(f"参数 {param} 不满足约束: {constraint}")
        
        # 检查未知参数
        known_params = set(self.required_params) | set(self.optional_params.keys())
        for param in params:
            if param not in known_params:
                warnings.append(f"未知参数: {param}")
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            suggestions=suggestions
        )
    
    def _check_constraint(self, value: Any, constraint: Dict[str, Any]) -> bool:
        """检查参数约束"""
        constraint_type = constraint.get('type')
        
        if constraint_type == 'range':
            min_val = constraint.get('min')
            max_val = constraint.get('max')
            return (min_val is None or value >= min_val) and (max_val is None or value <= max_val)
        
        elif constraint_type == 'choices':
            return value in constraint.get('values', [])
        
        elif constraint_type == 'type':
            expected_type = constraint.get('value')
            if expected_type == 'bool':
                return isinstance(value, bool)
            elif expected_type == 'int':
                return isinstance(value, int)
            elif expected_type == 'float':
                return isinstance(value, (int, float))
            elif expected_type == 'str':
                return isinstance(value, str)
            elif expected_type == 'list':
                return isinstance(value, list)
            else:
                return True  # 未知类型，跳过验证
        
        elif constraint_type == 'shape':
            if not isinstance(value, (list, tuple)):
                return False
            expected_len = constraint.get('length')
            return expected_len is None or len(value) == expected_len
        
        return True
    
    def get_layer_info(self) -> Dict[str, Any]:
        """获取层的完整信息"""
        return {
            'type': self.layer_type,
            'category': self.category,
            'description': self.description,
            'supported_frameworks': [f.value for f in self.supported_frameworks],
            'parameters': self.get_parameter_info()
        }

class LayerRegistry:
    """层注册系统"""
    
    _layers: Dict[str, BaseLayer] = {}
    _categories: Dict[str, List[str]] = {}
    
    @classmethod
    def register(cls, layer_type: str, layer_class: BaseLayer):
        """注册层"""
        if layer_type in cls._layers:
            logger.warning(f"层类型 {layer_type} 已存在，将被覆盖")
        
        cls._layers[layer_type] = layer_class
        
        # 更新分类
        category = layer_class.category
        if category not in cls._categories:
            cls._categories[category] = []
        if layer_type not in cls._categories[category]:
            cls._categories[category].append(layer_type)
        
        logger.info(f"注册层: {layer_type} (类别: {category})")
    
    @classmethod
    def get_layer(cls, layer_type: str) -> Optional[BaseLayer]:
        """获取层"""
        return cls._layers.get(layer_type)
    
    @classmethod
    def get_all_layers(cls) -> Dict[str, BaseLayer]:
        """获取所有层"""
        return cls._layers.copy()
    
    @classmethod
    def get_layers_by_category(cls, category: str) -> List[BaseLayer]:
        """按分类获取层"""
        layer_types = cls._categories.get(category, [])
        return [cls._layers[layer_type] for layer_type in layer_types]
    
    @classmethod
    def get_categories(cls) -> List[str]:
        """获取所有分类"""
        return list(cls._categories.keys())
    
    @classmethod
    def get_layer_info_all(cls) -> Dict[str, Any]:
        """获取所有层的信息"""
        return {
            'categories': cls._categories,
            'layers': {
                layer_type: layer.get_layer_info() 
                for layer_type, layer in cls._layers.items()
            }
        }

# 装饰器用于自动注册层
def register_layer(layer_type: str, category: str = "custom"):
    """层注册装饰器"""
    def decorator(cls):
        if not issubclass(cls, BaseLayer):
            raise TypeError("只能注册BaseLayer的子类")
        
        # 创建实例并注册
        instance = cls(layer_type, category, cls.__doc__ or "")
        LayerRegistry.register(layer_type, instance)
        return cls
    
    return decorator 