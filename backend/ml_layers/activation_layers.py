"""
激活层组件 - ReLU, Sigmoid, Tanh, Softmax等
"""

from typing import Dict, Any, Tuple
from .base_layer import BaseLayer, LayerConfig, ValidationResult, register_layer

@register_layer("activation", "activation")
class ActivationLayer(BaseLayer):
    """统一激活层 - 支持所有激活函数类型"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['activation_type']
        self.optional_params = {
            'activation_type': 'relu',
            # ReLU参数
            'max_value': None,
            'negative_slope': 0.0,
            'threshold': 0.0,
            # LeakyReLU参数
            'alpha': 0.3,
            # ELU参数
            'elu_alpha': 1.0,
            # PReLU参数
            'alpha_initializer': 'zeros',
            'shared_axes': None,
            # Softmax参数
            'axis': -1,
            # GELU参数
            'approximate': False
        }
        self.param_constraints = {
            'activation_type': {'type': 'choices', 'values': [
                'relu', 'leaky_relu', 'elu', 'prelu', 'sigmoid', 'tanh', 
                'softmax', 'swish', 'gelu', 'mish'
            ]},
            'max_value': {'type': 'range', 'min': 0.0, 'max': 100.0},
            'negative_slope': {'type': 'range', 'min': 0.0, 'max': 1.0},
            'threshold': {'type': 'range', 'min': 0.0, 'max': 10.0},
            'alpha': {'type': 'range', 'min': 0.0, 'max': 1.0},
            'elu_alpha': {'type': 'range', 'min': 0.1, 'max': 10.0},
            'axis': {'type': 'range', 'min': -10, 'max': 10}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        result = self.validate_parameters(config.parameters)
        
        # 验证激活类型
        activation_type = config.parameters.get('activation_type', 'relu')
        if activation_type not in self.param_constraints['activation_type']['values']:
            result.errors.append(f"不支持的激活函数类型: {activation_type}")
        
        return result
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        activation_type = config.parameters.get('activation_type', 'relu')
        params = config.parameters
        
        if activation_type == 'relu':
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
                
        elif activation_type == 'leaky_relu':
            alpha = params.get('alpha', 0.3)
            return f"layers.LeakyReLU(alpha={alpha})"
            
        elif activation_type == 'elu':
            alpha = params.get('elu_alpha', 1.0)
            return f"layers.ELU(alpha={alpha})"
            
        elif activation_type == 'prelu':
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
                
        elif activation_type == 'sigmoid':
            return "layers.Activation('sigmoid')"
            
        elif activation_type == 'tanh':
            return "layers.Activation('tanh')"
            
        elif activation_type == 'softmax':
            axis = params.get('axis', -1)
            return f"layers.Softmax(axis={axis})"
            
        elif activation_type == 'swish':
            return "layers.Activation('swish')"
            
        elif activation_type == 'gelu':
            return "layers.Activation('gelu')"
            
        elif activation_type == 'mish':
            return "# Mish激活函数需要自定义实现\n        layers.Activation('mish')"
            
        else:
            return f"layers.Activation('{activation_type}')"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        activation_type = config.parameters.get('activation_type', 'relu')
        params = config.parameters
        
        if activation_type == 'relu':
            negative_slope = params.get('negative_slope', 0.0)
            if negative_slope > 0:
                definition = f"self.activation_{layer_index} = nn.LeakyReLU({negative_slope})"
                forward = f"x = self.activation_{layer_index}(x)"
            else:
                definition = ""
                forward = "x = F.relu(x)"
                
        elif activation_type == 'leaky_relu':
            alpha = params.get('alpha', 0.3)
            definition = f"self.activation_{layer_index} = nn.LeakyReLU({alpha})"
            forward = f"x = self.activation_{layer_index}(x)"
            
        elif activation_type == 'elu':
            alpha = params.get('elu_alpha', 1.0)
            definition = f"self.activation_{layer_index} = nn.ELU(alpha={alpha})"
            forward = f"x = self.activation_{layer_index}(x)"
            
        elif activation_type == 'prelu':
            definition = f"self.activation_{layer_index} = nn.PReLU()"
            forward = f"x = self.activation_{layer_index}(x)"
            
        elif activation_type == 'sigmoid':
            definition = ""
            forward = "x = torch.sigmoid(x)"
            
        elif activation_type == 'tanh':
            definition = ""
            forward = "x = torch.tanh(x)"
            
        elif activation_type == 'softmax':
            axis = params.get('axis', -1)
            definition = f"self.activation_{layer_index} = nn.Softmax(dim={axis})"
            forward = f"x = self.activation_{layer_index}(x)"
            
        elif activation_type == 'swish':
            definition = ""
            forward = "x = x * torch.sigmoid(x)"
            
        elif activation_type == 'gelu':
            definition = ""
            forward = "x = F.gelu(x)"
            
        elif activation_type == 'mish':
            definition = ""
            forward = "x = x * torch.tanh(F.softplus(x))"
            
        else:
            definition = ""
            forward = f"x = F.{activation_type}(x)"
        
        return {'definition': definition, 'forward': forward} 