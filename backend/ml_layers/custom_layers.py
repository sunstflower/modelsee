"""
自定义层组件 - 特殊用途和自定义实现的层
"""

from typing import Dict, Any, Tuple
from .base_layer import BaseLayer, LayerConfig, ValidationResult, register_layer

@register_layer("reshape", "custom")
class ReshapeLayer(BaseLayer):
    """重塑层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['target_shape']
        self.optional_params = {}
        self.param_constraints = {
            'target_shape': {'type': 'shape', 'length': None}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        result = self.validate_parameters(config.parameters)
        
        target_shape = config.parameters.get('target_shape')
        if target_shape and not isinstance(target_shape, (list, tuple)):
            result.errors.append("target_shape必须是列表或元组")
        
        return result
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        target_shape = config.parameters.get('target_shape', [])
        if not target_shape:
            return input_shape
        
        # 保持batch维度
        return (input_shape[0],) + tuple(target_shape)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        target_shape = config.parameters.get('target_shape', [])
        return f"layers.Reshape({target_shape})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        target_shape = config.parameters.get('target_shape', [])
        definition = ""
        forward = f"x = x.view(x.size(0), {', '.join(map(str, target_shape))})"
        return {'definition': definition, 'forward': forward}

@register_layer("permute", "custom")
class PermuteLayer(BaseLayer):
    """维度置换层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['dims']
        self.optional_params = {}
        self.param_constraints = {
            'dims': {'type': 'shape', 'length': None}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        result = self.validate_parameters(config.parameters)
        
        dims = config.parameters.get('dims')
        if dims and not isinstance(dims, (list, tuple)):
            result.errors.append("dims必须是列表或元组")
        
        return result
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        dims = config.parameters.get('dims', [])
        if not dims or len(dims) != len(input_shape) - 1:  # 不包括batch维度
            return input_shape
        
        # 重新排列维度（保持batch维度在第一位）
        new_shape = [input_shape[0]]
        for dim in dims:
            new_shape.append(input_shape[dim + 1])  # +1因为跳过batch维度
        
        return tuple(new_shape)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        dims = config.parameters.get('dims', [])
        return f"layers.Permute({dims})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        dims = config.parameters.get('dims', [])
        # PyTorch的permute需要包含batch维度
        pytorch_dims = [0] + [d + 1 for d in dims]
        definition = ""
        forward = f"x = x.permute({', '.join(map(str, pytorch_dims))})"
        return {'definition': definition, 'forward': forward}

@register_layer("repeat_vector", "custom")
class RepeatVectorLayer(BaseLayer):
    """重复向量层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['n']
        self.optional_params = {}
        self.param_constraints = {
            'n': {'type': 'range', 'min': 1, 'max': 1000}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        n = config.parameters.get('n', 1)
        return (input_shape[0], n, input_shape[-1])
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        n = config.parameters.get('n', 1)
        return f"layers.RepeatVector({n})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        n = config.parameters.get('n', 1)
        definition = ""
        forward = f"x = x.unsqueeze(1).repeat(1, {n}, 1)"
        return {'definition': definition, 'forward': forward}

@register_layer("lambda", "custom")
class LambdaLayer(BaseLayer):
    """Lambda自定义层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['function']
        self.optional_params = {
            'output_shape': None,
            'mask': None,
            'arguments': {}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        result = self.validate_parameters(config.parameters)
        
        function = config.parameters.get('function')
        if not function or not isinstance(function, str):
            result.errors.append("function必须是字符串")
        
        return result
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        output_shape = config.parameters.get('output_shape')
        if output_shape:
            return (input_shape[0],) + tuple(output_shape)
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        function = config.parameters.get('function', 'lambda x: x')
        output_shape = config.parameters.get('output_shape')
        
        if output_shape:
            return f"layers.Lambda({function}, output_shape={output_shape})"
        else:
            return f"layers.Lambda({function})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        function = config.parameters.get('function', 'lambda x: x')
        # 将lambda函数转换为PyTorch代码
        definition = f"# Lambda函数: {function}"
        forward = f"# 自定义函数应用: {function}"
        return {'definition': definition, 'forward': forward}

@register_layer("masking", "custom")
class MaskingLayer(BaseLayer):
    """遮罩层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'mask_value': 0.0
        }
        self.param_constraints = {
            'mask_value': {'type': 'range', 'min': -1000.0, 'max': 1000.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        mask_value = config.parameters.get('mask_value', 0.0)
        return f"layers.Masking(mask_value={mask_value})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        mask_value = config.parameters.get('mask_value', 0.0)
        definition = f"# 遮罩层，mask_value={mask_value}"
        forward = f"# PyTorch中遮罩通常在attention中处理"
        return {'definition': definition, 'forward': forward}

@register_layer("cropping2d", "custom")
class Cropping2DLayer(BaseLayer):
    """二维裁剪层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['cropping']
        self.optional_params = {
            'data_format': None
        }
        self.param_constraints = {
            'cropping': {'type': 'shape', 'length': 2}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        result = self.validate_parameters(config.parameters)
        
        cropping = config.parameters.get('cropping')
        if cropping:
            if not isinstance(cropping, (list, tuple)) or len(cropping) != 2:
                result.errors.append("cropping必须是长度为2的列表")
            elif any(not isinstance(c, (int, list, tuple)) for c in cropping):
                result.errors.append("cropping元素必须是整数或长度为2的列表")
        
        return result
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        if len(input_shape) != 4:
            return input_shape
        
        cropping = config.parameters.get('cropping', [[0, 0], [0, 0]])
        batch, height, width, channels = input_shape
        
        # 处理cropping格式
        if isinstance(cropping[0], int):
            crop_h = [cropping[0], cropping[0]]
        else:
            crop_h = cropping[0]
        
        if isinstance(cropping[1], int):
            crop_w = [cropping[1], cropping[1]]
        else:
            crop_w = cropping[1]
        
        new_height = height - crop_h[0] - crop_h[1]
        new_width = width - crop_w[0] - crop_w[1]
        
        return (batch, new_height, new_width, channels)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        cropping = config.parameters.get('cropping', [[1, 1], [1, 1]])
        return f"layers.Cropping2D({cropping})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        cropping = config.parameters.get('cropping', [[1, 1], [1, 1]])
        
        # 处理cropping格式
        if isinstance(cropping[0], int):
            crop_h = [cropping[0], cropping[0]]
        else:
            crop_h = cropping[0]
        
        if isinstance(cropping[1], int):
            crop_w = [cropping[1], cropping[1]]
        else:
            crop_w = cropping[1]
        
        definition = ""
        forward = f"# 2D裁剪\n" \
                 f"        h_start, h_end = {crop_h[0]}, x.size(2) - {crop_h[1]}\n" \
                 f"        w_start, w_end = {crop_w[0]}, x.size(3) - {crop_w[1]}\n" \
                 f"        x = x[:, :, h_start:h_end, w_start:w_end]"
        
        return {'definition': definition, 'forward': forward}

@register_layer("zero_padding2d", "custom")
class ZeroPadding2DLayer(BaseLayer):
    """二维零填充层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'padding': [[1, 1], [1, 1]],
            'data_format': None
        }
        self.param_constraints = {
            'padding': {'type': 'shape', 'length': 2}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        if len(input_shape) != 4:
            return input_shape
        
        padding = config.parameters.get('padding', [[1, 1], [1, 1]])
        batch, height, width, channels = input_shape
        
        # 处理padding格式
        if isinstance(padding[0], int):
            pad_h = [padding[0], padding[0]]
        else:
            pad_h = padding[0]
        
        if isinstance(padding[1], int):
            pad_w = [padding[1], padding[1]]
        else:
            pad_w = padding[1]
        
        new_height = height + pad_h[0] + pad_h[1]
        new_width = width + pad_w[0] + pad_w[1]
        
        return (batch, new_height, new_width, channels)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        padding = config.parameters.get('padding', [[1, 1], [1, 1]])
        return f"layers.ZeroPadding2D({padding})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        padding = config.parameters.get('padding', [[1, 1], [1, 1]])
        
        # PyTorch的pad格式是 (left, right, top, bottom)
        if isinstance(padding[0], int):
            pad_h = [padding[0], padding[0]]
        else:
            pad_h = padding[0]
        
        if isinstance(padding[1], int):
            pad_w = [padding[1], padding[1]]
        else:
            pad_w = padding[1]
        
        # PyTorch格式: (left, right, top, bottom)
        pad_values = f"({pad_w[0]}, {pad_w[1]}, {pad_h[0]}, {pad_h[1]})"
        
        definition = ""
        forward = f"x = F.pad(x, {pad_values}, mode='constant', value=0)"
        
        return {'definition': definition, 'forward': forward} 