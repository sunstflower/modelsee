"""
正则化层组件 - Dropout, BatchNorm, LayerNorm等
"""

from typing import Dict, Any, Tuple
from .base_layer import BaseLayer, LayerConfig, ValidationResult, register_layer

@register_layer("dropout", "regularization")
class DropoutLayer(BaseLayer):
    """Dropout正则化层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['rate']
        self.optional_params = {
            'noise_shape': None,
            'seed': None
        }
        self.param_constraints = {
            'rate': {'type': 'range', 'min': 0.0, 'max': 1.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        rate = config.parameters.get('rate', 0.5)
        return f"layers.Dropout({rate})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        rate = config.parameters.get('rate', 0.5)
        definition = f"self.dropout_{layer_index} = nn.Dropout({rate})"
        forward = f"x = self.dropout_{layer_index}(x)"
        return {'definition': definition, 'forward': forward}

@register_layer("batch_normalization", "regularization")
class BatchNormalizationLayer(BaseLayer):
    """批量归一化层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'axis': -1,
            'momentum': 0.99,
            'epsilon': 0.001,
            'center': True,
            'scale': True,
            'beta_initializer': 'zeros',
            'gamma_initializer': 'ones'
        }
        self.param_constraints = {
            'momentum': {'type': 'range', 'min': 0.0, 'max': 1.0},
            'epsilon': {'type': 'range', 'min': 1e-8, 'max': 1e-2}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        axis = params.get('axis', -1)
        momentum = params.get('momentum', 0.99)
        epsilon = params.get('epsilon', 0.001)
        
        code_parts = ["layers.BatchNormalization("]
        
        if axis != -1:
            code_parts.append(f"axis={axis}")
        
        if momentum != 0.99:
            code_parts.append(f"momentum={momentum}")
        
        if epsilon != 0.001:
            code_parts.append(f"epsilon={epsilon}")
        
        if len(code_parts) > 1:
            return f"{', '.join(code_parts)})"
        else:
            return "layers.BatchNormalization()"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        momentum = params.get('momentum', 0.99)
        epsilon = params.get('epsilon', 0.001)
        
        # PyTorch需要知道特征数量
        num_features = "# 需要根据前一层计算"
        if config.input_shape:
            num_features = config.input_shape[-1]
        
        definition = f"self.batchnorm_{layer_index} = nn.BatchNorm1d({num_features}, " \
                    f"eps={epsilon}, momentum={1-momentum})"  # PyTorch momentum定义不同
        forward = f"x = self.batchnorm_{layer_index}(x)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("layer_normalization", "regularization")
class LayerNormalizationLayer(BaseLayer):
    """层归一化层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'axis': -1,
            'epsilon': 0.001,
            'center': True,
            'scale': True,
            'beta_initializer': 'zeros',
            'gamma_initializer': 'ones'
        }
        self.param_constraints = {
            'epsilon': {'type': 'range', 'min': 1e-8, 'max': 1e-2}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        axis = params.get('axis', -1)
        epsilon = params.get('epsilon', 0.001)
        
        code_parts = ["layers.LayerNormalization("]
        
        if axis != -1:
            code_parts.append(f"axis={axis}")
        
        if epsilon != 0.001:
            code_parts.append(f"epsilon={epsilon}")
        
        if len(code_parts) > 1:
            return f"{', '.join(code_parts)})"
        else:
            return "layers.LayerNormalization()"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        epsilon = params.get('epsilon', 0.001)
        
        # PyTorch需要知道归一化的维度
        normalized_shape = "# 需要根据前一层计算"
        if config.input_shape:
            normalized_shape = config.input_shape[-1]
        
        definition = f"self.layernorm_{layer_index} = nn.LayerNorm({normalized_shape}, eps={epsilon})"
        forward = f"x = self.layernorm_{layer_index}(x)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("group_normalization", "regularization")
class GroupNormalizationLayer(BaseLayer):
    """组归一化层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['groups']
        self.optional_params = {
            'axis': -1,
            'epsilon': 0.001,
            'center': True,
            'scale': True
        }
        self.param_constraints = {
            'groups': {'type': 'range', 'min': 1, 'max': 128},
            'epsilon': {'type': 'range', 'min': 1e-8, 'max': 1e-2}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        # TensorFlow没有直接的GroupNormalization，需要使用tf_addons
        params = config.parameters
        groups = params.get('groups', 32)
        epsilon = params.get('epsilon', 0.001)
        
        return f"tfa.layers.GroupNormalization(groups={groups}, epsilon={epsilon})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        groups = params.get('groups', 32)
        epsilon = params.get('epsilon', 0.001)
        
        num_channels = "# 需要根据前一层计算"
        if config.input_shape:
            num_channels = config.input_shape[-1]
        
        definition = f"self.groupnorm_{layer_index} = nn.GroupNorm({groups}, {num_channels}, eps={epsilon})"
        forward = f"x = self.groupnorm_{layer_index}(x)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("alpha_dropout", "regularization")
class AlphaDropoutLayer(BaseLayer):
    """Alpha Dropout层（用于SELU激活）"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['rate']
        self.optional_params = {
            'noise_shape': None,
            'seed': None
        }
        self.param_constraints = {
            'rate': {'type': 'range', 'min': 0.0, 'max': 1.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        rate = config.parameters.get('rate', 0.5)
        return f"layers.AlphaDropout({rate})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        rate = config.parameters.get('rate', 0.5)
        definition = f"self.alpha_dropout_{layer_index} = nn.AlphaDropout({rate})"
        forward = f"x = self.alpha_dropout_{layer_index}(x)"
        return {'definition': definition, 'forward': forward}

@register_layer("gaussian_dropout", "regularization")
class GaussianDropoutLayer(BaseLayer):
    """高斯Dropout层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['rate']
        self.optional_params = {}
        self.param_constraints = {
            'rate': {'type': 'range', 'min': 0.0, 'max': 1.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        rate = config.parameters.get('rate', 0.5)
        return f"layers.GaussianDropout({rate})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        # PyTorch没有直接的GaussianDropout，需要自定义实现
        rate = config.parameters.get('rate', 0.5)
        definition = f"# 高斯Dropout需要自定义实现"
        forward = f"if self.training:\n" \
                 f"            noise = torch.randn_like(x) * {rate} + 1.0\n" \
                 f"            x = x * noise\n" \
                 f"        # else: x = x  # 推理时不变"
        return {'definition': definition, 'forward': forward}

@register_layer("spectral_normalization", "regularization")
class SpectralNormalizationLayer(BaseLayer):
    """谱归一化层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'power_iterations': 1
        }
        self.param_constraints = {
            'power_iterations': {'type': 'range', 'min': 1, 'max': 10}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        # TensorFlow需要使用tf_addons
        power_iterations = config.parameters.get('power_iterations', 1)
        return f"tfa.layers.SpectralNormalization(power_iterations={power_iterations})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        # PyTorch的谱归一化通常应用于其他层
        power_iterations = config.parameters.get('power_iterations', 1)
        definition = f"# 谱归一化通常应用于其他层，如nn.utils.spectral_norm(layer)"
        forward = f"# 谱归一化在层定义时应用"
        return {'definition': definition, 'forward': forward} 