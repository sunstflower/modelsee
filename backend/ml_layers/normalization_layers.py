"""
归一化层组件 - 各种归一化层的扩展实现
"""

from typing import Dict, Any, Tuple
from .base_layer import BaseLayer, LayerConfig, ValidationResult, register_layer

@register_layer("instance_normalization", "normalization")
class InstanceNormalizationLayer(BaseLayer):
    """实例归一化层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'axis': -1,
            'epsilon': 0.001,
            'center': True,
            'scale': True
        }
        self.param_constraints = {
            'epsilon': {'type': 'range', 'min': 1e-8, 'max': 1e-2}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        # TensorFlow需要使用tf_addons
        params = config.parameters
        epsilon = params.get('epsilon', 0.001)
        return f"tfa.layers.InstanceNormalization(epsilon={epsilon})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        epsilon = params.get('epsilon', 0.001)
        
        num_features = "# 需要根据前一层计算"
        if config.input_shape:
            num_features = config.input_shape[-1]
        
        definition = f"self.instance_norm_{layer_index} = nn.InstanceNorm1d({num_features}, eps={epsilon})"
        forward = f"x = self.instance_norm_{layer_index}(x)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("weight_normalization", "normalization")
class WeightNormalizationLayer(BaseLayer):
    """权重归一化层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'dim': 0
        }
        self.param_constraints = {
            'dim': {'type': 'range', 'min': 0, 'max': 3}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        # TensorFlow需要自定义实现
        return "# 权重归一化需要在层定义时应用"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        dim = config.parameters.get('dim', 0)
        definition = f"# 权重归一化通常应用于其他层，如nn.utils.weight_norm(layer, dim={dim})"
        forward = f"# 权重归一化在层定义时应用"
        return {'definition': definition, 'forward': forward}

@register_layer("local_response_normalization", "normalization")
class LocalResponseNormalizationLayer(BaseLayer):
    """局部响应归一化层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'depth_radius': 5,
            'bias': 1.0,
            'alpha': 0.0001,
            'beta': 0.75
        }
        self.param_constraints = {
            'depth_radius': {'type': 'range', 'min': 1, 'max': 20},
            'bias': {'type': 'range', 'min': 0.1, 'max': 10.0},
            'alpha': {'type': 'range', 'min': 0.00001, 'max': 0.01},
            'beta': {'type': 'range', 'min': 0.1, 'max': 2.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        depth_radius = params.get('depth_radius', 5)
        bias = params.get('bias', 1.0)
        alpha = params.get('alpha', 0.0001)
        beta = params.get('beta', 0.75)
        
        return f"tf.nn.local_response_normalization(depth_radius={depth_radius}, " \
               f"bias={bias}, alpha={alpha}, beta={beta})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        size = params.get('depth_radius', 5) * 2 + 1
        alpha = params.get('alpha', 0.0001)
        beta = params.get('beta', 0.75)
        k = params.get('bias', 1.0)
        
        definition = f"self.lrn_{layer_index} = nn.LocalResponseNorm({size}, alpha={alpha}, beta={beta}, k={k})"
        forward = f"x = self.lrn_{layer_index}(x)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("unit_normalization", "normalization")
class UnitNormalizationLayer(BaseLayer):
    """单位归一化层（L2归一化）"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'axis': -1
        }
        self.param_constraints = {
            'axis': {'type': 'range', 'min': -10, 'max': 10}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        axis = config.parameters.get('axis', -1)
        return f"layers.UnitNormalization(axis={axis})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        axis = config.parameters.get('axis', -1)
        definition = ""
        forward = f"x = F.normalize(x, p=2, dim={axis})"
        return {'definition': definition, 'forward': forward}

@register_layer("cosine_normalization", "normalization")
class CosineNormalizationLayer(BaseLayer):
    """余弦归一化层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'axis': -1,
            'epsilon': 1e-12
        }
        self.param_constraints = {
            'axis': {'type': 'range', 'min': -10, 'max': 10},
            'epsilon': {'type': 'range', 'min': 1e-15, 'max': 1e-6}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        # TensorFlow需要自定义实现
        axis = config.parameters.get('axis', -1)
        epsilon = config.parameters.get('epsilon', 1e-12)
        return f"layers.Lambda(lambda x: tf.nn.l2_normalize(x, axis={axis}, epsilon={epsilon}))"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        axis = config.parameters.get('axis', -1)
        epsilon = config.parameters.get('epsilon', 1e-12)
        definition = ""
        forward = f"x = F.normalize(x, p=2, dim={axis}, eps={epsilon})"
        return {'definition': definition, 'forward': forward} 