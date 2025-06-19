"""
基础层组件 - Dense, Conv2D, Pooling等
"""

from typing import Dict, Any, Tuple
from .base_layer import BaseLayer, LayerConfig, ValidationResult, register_layer

@register_layer("dense", "basic")
class DenseLayer(BaseLayer):
    """全连接层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['units']
        self.optional_params = {
            'activation': 'linear',
            'use_bias': True,
            'kernel_initializer': 'glorot_uniform',
            'bias_initializer': 'zeros',
            'kernel_regularizer': None,
            'bias_regularizer': None,
            'activity_regularizer': None
        }
        self.param_constraints = {
            'units': {'type': 'range', 'min': 1, 'max': 10000},
            'activation': {'type': 'choices', 'values': [
                'linear', 'relu', 'sigmoid', 'tanh', 'softmax', 'leaky_relu', 'elu', 'selu'
            ]},
            'use_bias': {'type': 'type', 'value': 'bool'}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        """验证配置"""
        result = self.validate_parameters(config.parameters)
        
        # 额外验证
        if 'units' in config.parameters:
            units = config.parameters['units']
            if not isinstance(units, int) or units <= 0:
                result.errors.append("units必须是正整数")
        
        return result
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        """计算输出形状"""
        units = config.parameters.get('units', 128)
        if len(input_shape) == 1:
            return (units,)
        else:
            return input_shape[:-1] + (units,)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        """生成TensorFlow代码"""
        params = config.parameters
        units = params.get('units', 128)
        activation = params.get('activation', 'linear')
        use_bias = params.get('use_bias', True)
        
        code_parts = [f"layers.Dense({units}"]
        
        if activation != 'linear':
            code_parts.append(f"activation='{activation}'")
        
        if not use_bias:
            code_parts.append("use_bias=False")
        
        if is_first_layer and config.input_shape:
            input_shape_str = str(config.input_shape).replace('None', 'None')
            code_parts.append(f"input_shape={input_shape_str}")
        
        return f"{', '.join(code_parts)})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        """生成PyTorch代码"""
        params = config.parameters
        units = params.get('units', 128)
        use_bias = params.get('use_bias', True)
        activation = params.get('activation', 'linear')
        
        # 需要根据前一层计算输入特征数
        in_features = "# 需要根据前一层计算"
        if config.input_shape:
            in_features = config.input_shape[-1]
        
        definition = f"self.dense_{layer_index} = nn.Linear({in_features}, {units}, bias={use_bias})"
        
        forward = f"x = self.dense_{layer_index}(x)"
        if activation != 'linear':
            if activation == 'relu':
                forward += f"\n        x = F.relu(x)"
            elif activation == 'sigmoid':
                forward += f"\n        x = torch.sigmoid(x)"
            elif activation == 'tanh':
                forward += f"\n        x = torch.tanh(x)"
            elif activation == 'softmax':
                forward += f"\n        x = F.softmax(x, dim=1)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("conv2d", "basic")
class Conv2DLayer(BaseLayer):
    """二维卷积层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['filters', 'kernel_size']
        self.optional_params = {
            'strides': [1, 1],
            'padding': 'valid',
            'activation': 'linear',
            'use_bias': True,
            'kernel_initializer': 'glorot_uniform',
            'bias_initializer': 'zeros',
            'dilation_rate': [1, 1]
        }
        self.param_constraints = {
            'filters': {'type': 'range', 'min': 1, 'max': 2048},
            'kernel_size': {'type': 'shape', 'length': 2},
            'strides': {'type': 'shape', 'length': 2},
            'padding': {'type': 'choices', 'values': ['valid', 'same']},
            'activation': {'type': 'choices', 'values': [
                'linear', 'relu', 'sigmoid', 'tanh', 'leaky_relu', 'elu'
            ]}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        """验证配置"""
        result = self.validate_parameters(config.parameters)
        
        # 验证kernel_size
        if 'kernel_size' in config.parameters:
            kernel_size = config.parameters['kernel_size']
            if not isinstance(kernel_size, (list, tuple)) or len(kernel_size) != 2:
                result.errors.append("kernel_size必须是长度为2的列表或元组")
            elif any(k <= 0 for k in kernel_size):
                result.errors.append("kernel_size的值必须大于0")
        
        return result
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        """计算输出形状"""
        if len(input_shape) != 4:  # (batch, height, width, channels)
            raise ValueError("Conv2D输入必须是4维: (batch, height, width, channels)")
        
        params = config.parameters
        filters = params.get('filters', 32)
        kernel_size = params.get('kernel_size', [3, 3])
        strides = params.get('strides', [1, 1])
        padding = params.get('padding', 'valid')
        
        batch, height, width, _ = input_shape
        
        if padding == 'same':
            out_height = height // strides[0]
            out_width = width // strides[1]
        else:  # 'valid'
            out_height = (height - kernel_size[0]) // strides[0] + 1
            out_width = (width - kernel_size[1]) // strides[1] + 1
        
        return (batch, out_height, out_width, filters)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        """生成TensorFlow代码"""
        params = config.parameters
        filters = params.get('filters', 32)
        kernel_size = params.get('kernel_size', [3, 3])
        strides = params.get('strides', [1, 1])
        padding = params.get('padding', 'valid')
        activation = params.get('activation', 'linear')
        
        code_parts = [f"layers.Conv2D({filters}, {kernel_size}"]
        
        if strides != [1, 1]:
            code_parts.append(f"strides={strides}")
        
        if padding != 'valid':
            code_parts.append(f"padding='{padding}'")
        
        if activation != 'linear':
            code_parts.append(f"activation='{activation}'")
        
        if is_first_layer and config.input_shape:
            input_shape_str = str(config.input_shape[1:])  # 去掉batch维度
            code_parts.append(f"input_shape={input_shape_str}")
        
        return f"{', '.join(code_parts)})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        """生成PyTorch代码"""
        params = config.parameters
        filters = params.get('filters', 32)
        kernel_size = params.get('kernel_size', [3, 3])
        strides = params.get('strides', [1, 1])
        padding = params.get('padding', 'valid')
        activation = params.get('activation', 'linear')
        
        # 计算输入通道数
        in_channels = "# 需要根据前一层计算"
        if config.input_shape:
            in_channels = config.input_shape[-1]  # 假设是NHWC格式
        
        # PyTorch的padding参数
        if padding == 'same':
            padding_value = 'same'
        else:
            padding_value = 0
        
        definition = f"self.conv2d_{layer_index} = nn.Conv2d({in_channels}, {filters}, " \
                    f"{kernel_size[0]}, stride={strides[0]}, padding={padding_value})"
        
        forward = f"x = self.conv2d_{layer_index}(x)"
        if activation != 'linear':
            if activation == 'relu':
                forward += f"\n        x = F.relu(x)"
            elif activation == 'sigmoid':
                forward += f"\n        x = torch.sigmoid(x)"
            elif activation == 'tanh':
                forward += f"\n        x = torch.tanh(x)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("maxpool2d", "basic")
class MaxPool2DLayer(BaseLayer):
    """二维最大池化层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['pool_size']
        self.optional_params = {
            'strides': None,  # 默认等于pool_size
            'padding': 'valid'
        }
        self.param_constraints = {
            'pool_size': {'type': 'shape', 'length': 2},
            'padding': {'type': 'choices', 'values': ['valid', 'same']}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        """验证配置"""
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        """计算输出形状"""
        if len(input_shape) != 4:
            raise ValueError("MaxPool2D输入必须是4维")
        
        params = config.parameters
        pool_size = params.get('pool_size', [2, 2])
        strides = params.get('strides', pool_size)
        padding = params.get('padding', 'valid')
        
        batch, height, width, channels = input_shape
        
        if padding == 'same':
            out_height = height // strides[0]
            out_width = width // strides[1]
        else:  # 'valid'
            out_height = (height - pool_size[0]) // strides[0] + 1
            out_width = (width - pool_size[1]) // strides[1] + 1
        
        return (batch, out_height, out_width, channels)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        """生成TensorFlow代码"""
        params = config.parameters
        pool_size = params.get('pool_size', [2, 2])
        strides = params.get('strides', pool_size)
        padding = params.get('padding', 'valid')
        
        code_parts = [f"layers.MaxPooling2D({pool_size}"]
        
        if strides != pool_size:
            code_parts.append(f"strides={strides}")
        
        if padding != 'valid':
            code_parts.append(f"padding='{padding}'")
        
        return f"{', '.join(code_parts)})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        """生成PyTorch代码"""
        params = config.parameters
        pool_size = params.get('pool_size', [2, 2])
        strides = params.get('strides', pool_size)
        
        definition = f"self.maxpool_{layer_index} = nn.MaxPool2d({pool_size[0]}, stride={strides[0]})"
        forward = f"x = self.maxpool_{layer_index}(x)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("avgpool2d", "basic")
class AvgPool2DLayer(BaseLayer):
    """二维平均池化层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['pool_size']
        self.optional_params = {
            'strides': None,
            'padding': 'valid'
        }
        self.param_constraints = {
            'pool_size': {'type': 'shape', 'length': 2},
            'padding': {'type': 'choices', 'values': ['valid', 'same']}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        # 与MaxPool2D相同的逻辑
        if len(input_shape) != 4:
            raise ValueError("AvgPool2D输入必须是4维")
        
        params = config.parameters
        pool_size = params.get('pool_size', [2, 2])
        strides = params.get('strides', pool_size)
        padding = params.get('padding', 'valid')
        
        batch, height, width, channels = input_shape
        
        if padding == 'same':
            out_height = height // strides[0]
            out_width = width // strides[1]
        else:
            out_height = (height - pool_size[0]) // strides[0] + 1
            out_width = (width - pool_size[1]) // strides[1] + 1
        
        return (batch, out_height, out_width, channels)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        pool_size = params.get('pool_size', [2, 2])
        strides = params.get('strides', pool_size)
        padding = params.get('padding', 'valid')
        
        code_parts = [f"layers.AveragePooling2D({pool_size}"]
        
        if strides != pool_size:
            code_parts.append(f"strides={strides}")
        
        if padding != 'valid':
            code_parts.append(f"padding='{padding}'")
        
        return f"{', '.join(code_parts)})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        pool_size = params.get('pool_size', [2, 2])
        strides = params.get('strides', pool_size)
        
        definition = f"self.avgpool_{layer_index} = nn.AvgPool2d({pool_size[0]}, stride={strides[0]})"
        forward = f"x = self.avgpool_{layer_index}(x)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("flatten", "basic")
class FlattenLayer(BaseLayer):
    """展平层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {}
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return ValidationResult(True, [], [], [])
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        if len(input_shape) < 2:
            return input_shape
        
        batch_size = input_shape[0]
        flattened_size = 1
        for dim in input_shape[1:]:
            flattened_size *= dim
        
        return (batch_size, flattened_size)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        return "layers.Flatten()"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        definition = ""  # Flatten不需要定义层
        forward = "x = x.view(x.size(0), -1)  # Flatten"
        
        return {'definition': definition, 'forward': forward} 