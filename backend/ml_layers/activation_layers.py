"""
激活层组件 - ReLU, Sigmoid, Tanh, Softmax等
"""

from typing import Dict, Any, Tuple
from .base_layer import BaseLayer, LayerConfig, ValidationResult, register_layer

@register_layer("relu", "activation")
class ReLULayer(BaseLayer):
    """ReLU激活层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'max_value': None,
            'negative_slope': 0.0,
            'threshold': 0.0
        }
        self.param_constraints = {
            'max_value': {'type': 'range', 'min': 0.0, 'max': 100.0},
            'negative_slope': {'type': 'range', 'min': 0.0, 'max': 1.0},
            'threshold': {'type': 'range', 'min': 0.0, 'max': 10.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        max_value = params.get('max_value')
        negative_slope = params.get('negative_slope', 0.0)
        threshold = params.get('threshold', 0.0)
        
        code_parts = ["layers.ReLU("]
        
        if max_value is not None:
            code_parts.append(f"max_value={max_value}")
        
        if negative_slope > 0:
            code_parts.append(f"negative_slope={negative_slope}")
        
        if threshold > 0:
            code_parts.append(f"threshold={threshold}")
        
        if len(code_parts) > 1:
            return f"{', '.join(code_parts)})"
        else:
            return "layers.ReLU()"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        negative_slope = params.get('negative_slope', 0.0)
        
        if negative_slope > 0:
            definition = f"self.relu_{layer_index} = nn.LeakyReLU({negative_slope})"
            forward = f"x = self.relu_{layer_index}(x)"
        else:
            definition = ""
            forward = "x = F.relu(x)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("leaky_relu", "activation")
class LeakyReLULayer(BaseLayer):
    """LeakyReLU激活层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'alpha': 0.3
        }
        self.param_constraints = {
            'alpha': {'type': 'range', 'min': 0.0, 'max': 1.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        alpha = config.parameters.get('alpha', 0.3)
        return f"layers.LeakyReLU(alpha={alpha})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        alpha = config.parameters.get('alpha', 0.3)
        definition = f"self.leaky_relu_{layer_index} = nn.LeakyReLU({alpha})"
        forward = f"x = self.leaky_relu_{layer_index}(x)"
        return {'definition': definition, 'forward': forward}

@register_layer("elu", "activation")
class ELULayer(BaseLayer):
    """ELU激活层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'alpha': 1.0
        }
        self.param_constraints = {
            'alpha': {'type': 'range', 'min': 0.1, 'max': 10.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        alpha = config.parameters.get('alpha', 1.0)
        return f"layers.ELU(alpha={alpha})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        alpha = config.parameters.get('alpha', 1.0)
        definition = f"self.elu_{layer_index} = nn.ELU(alpha={alpha})"
        forward = f"x = self.elu_{layer_index}(x)"
        return {'definition': definition, 'forward': forward}

@register_layer("prelu", "activation")
class PReLULayer(BaseLayer):
    """PReLU参数化ReLU激活层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'alpha_initializer': 'zeros',
            'shared_axes': None
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        alpha_initializer = params.get('alpha_initializer', 'zeros')
        shared_axes = params.get('shared_axes')
        
        code_parts = ["layers.PReLU("]
        
        if alpha_initializer != 'zeros':
            code_parts.append(f"alpha_initializer='{alpha_initializer}'")
        
        if shared_axes is not None:
            code_parts.append(f"shared_axes={shared_axes}")
        
        if len(code_parts) > 1:
            return f"{', '.join(code_parts)})"
        else:
            return "layers.PReLU()"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        # PyTorch的PReLU需要指定参数数量
        definition = f"self.prelu_{layer_index} = nn.PReLU()"
        forward = f"x = self.prelu_{layer_index}(x)"
        return {'definition': definition, 'forward': forward}

@register_layer("sigmoid", "activation")
class SigmoidLayer(BaseLayer):
    """Sigmoid激活层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {}
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return ValidationResult(True, [], [], [])
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        return "layers.Activation('sigmoid')"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        definition = ""
        forward = "x = torch.sigmoid(x)"
        return {'definition': definition, 'forward': forward}

@register_layer("tanh", "activation")
class TanhLayer(BaseLayer):
    """Tanh激活层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {}
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return ValidationResult(True, [], [], [])
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        return "layers.Activation('tanh')"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        definition = ""
        forward = "x = torch.tanh(x)"
        return {'definition': definition, 'forward': forward}

@register_layer("softmax", "activation")
class SoftmaxLayer(BaseLayer):
    """Softmax激活层"""
    
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
        if axis != -1:
            return f"layers.Softmax(axis={axis})"
        else:
            return "layers.Softmax()"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        axis = config.parameters.get('axis', -1)
        definition = ""
        forward = f"x = F.softmax(x, dim={axis})"
        return {'definition': definition, 'forward': forward}

@register_layer("swish", "activation")
class SwishLayer(BaseLayer):
    """Swish激活层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {}
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return ValidationResult(True, [], [], [])
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        return "layers.Activation('swish')"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        definition = ""
        forward = "x = x * torch.sigmoid(x)  # Swish activation"
        return {'definition': definition, 'forward': forward}

@register_layer("gelu", "activation")
class GELULayer(BaseLayer):
    """GELU激活层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'approximate': False
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        approximate = config.parameters.get('approximate', False)
        if approximate:
            return "layers.Activation('gelu')"
        else:
            return "layers.Activation('gelu')"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        definition = ""
        forward = "x = F.gelu(x)"
        return {'definition': definition, 'forward': forward}

@register_layer("mish", "activation")
class MishLayer(BaseLayer):
    """Mish激活层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {}
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return ValidationResult(True, [], [], [])
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        # TensorFlow需要自定义Mish实现
        return "layers.Lambda(lambda x: x * tf.nn.tanh(tf.nn.softplus(x)))"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        definition = ""
        forward = "x = x * torch.tanh(F.softplus(x))  # Mish activation"
        return {'definition': definition, 'forward': forward} 