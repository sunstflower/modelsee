"""
高级层组件 - LSTM, GRU, Transformer等
"""

from typing import Dict, Any, Tuple
from .base_layer import BaseLayer, LayerConfig, ValidationResult, register_layer

@register_layer("lstm", "advanced")
class LSTMLayer(BaseLayer):
    """LSTM长短期记忆网络层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['units']
        self.optional_params = {
            'activation': 'tanh',
            'recurrent_activation': 'sigmoid',
            'use_bias': True,
            'return_sequences': False,
            'return_state': False,
            'go_backwards': False,
            'stateful': False,
            'dropout': 0.0,
            'recurrent_dropout': 0.0,
            'bidirectional': False
        }
        self.param_constraints = {
            'units': {'type': 'range', 'min': 1, 'max': 2048},
            'activation': {'type': 'choices', 'values': ['tanh', 'sigmoid', 'relu', 'linear']},
            'dropout': {'type': 'range', 'min': 0.0, 'max': 1.0},
            'recurrent_dropout': {'type': 'range', 'min': 0.0, 'max': 1.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        """计算LSTM输出形状"""
        if len(input_shape) != 3:  # (batch, timesteps, features)
            raise ValueError("LSTM输入必须是3维: (batch, timesteps, features)")
        
        params = config.parameters
        units = params.get('units', 128)
        return_sequences = params.get('return_sequences', False)
        bidirectional = params.get('bidirectional', False)
        
        batch, timesteps, _ = input_shape
        
        if bidirectional:
            units *= 2
        
        if return_sequences:
            return (batch, timesteps, units)
        else:
            return (batch, units)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        units = params.get('units', 128)
        activation = params.get('activation', 'tanh')
        return_sequences = params.get('return_sequences', False)
        dropout = params.get('dropout', 0.0)
        bidirectional = params.get('bidirectional', False)
        
        code_parts = [f"layers.LSTM({units}"]
        
        if activation != 'tanh':
            code_parts.append(f"activation='{activation}'")
        
        if return_sequences:
            code_parts.append("return_sequences=True")
        
        if dropout > 0:
            code_parts.append(f"dropout={dropout}")
        
        if is_first_layer and config.input_shape:
            input_shape_str = str(config.input_shape[1:])  # 去掉batch维度
            code_parts.append(f"input_shape={input_shape_str}")
        
        lstm_code = f"{', '.join(code_parts)})"
        
        if bidirectional:
            return f"layers.Bidirectional({lstm_code})"
        else:
            return lstm_code
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        units = params.get('units', 128)
        dropout = params.get('dropout', 0.0)
        bidirectional = params.get('bidirectional', False)
        return_sequences = params.get('return_sequences', False)
        
        input_size = "# 需要根据前一层计算"
        if config.input_shape:
            input_size = config.input_shape[-1]
        
        definition = f"self.lstm_{layer_index} = nn.LSTM({input_size}, {units}, " \
                    f"batch_first=True, dropout={dropout}, bidirectional={bidirectional})"
        
        if return_sequences:
            forward = f"x, _ = self.lstm_{layer_index}(x)  # 返回所有时间步"
        else:
            forward = f"x, _ = self.lstm_{layer_index}(x)\n" \
                     f"        x = x[:, -1, :]  # 只取最后一个时间步"
        
        return {'definition': definition, 'forward': forward}

@register_layer("gru", "advanced")
class GRULayer(BaseLayer):
    """GRU门控循环单元层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['units']
        self.optional_params = {
            'activation': 'tanh',
            'recurrent_activation': 'sigmoid',
            'use_bias': True,
            'return_sequences': False,
            'return_state': False,
            'go_backwards': False,
            'stateful': False,
            'dropout': 0.0,
            'recurrent_dropout': 0.0,
            'bidirectional': False
        }
        self.param_constraints = {
            'units': {'type': 'range', 'min': 1, 'max': 2048},
            'activation': {'type': 'choices', 'values': ['tanh', 'sigmoid', 'relu', 'linear']},
            'dropout': {'type': 'range', 'min': 0.0, 'max': 1.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        if len(input_shape) != 3:
            raise ValueError("GRU输入必须是3维: (batch, timesteps, features)")
        
        params = config.parameters
        units = params.get('units', 128)
        return_sequences = params.get('return_sequences', False)
        bidirectional = params.get('bidirectional', False)
        
        batch, timesteps, _ = input_shape
        
        if bidirectional:
            units *= 2
        
        if return_sequences:
            return (batch, timesteps, units)
        else:
            return (batch, units)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        units = params.get('units', 128)
        activation = params.get('activation', 'tanh')
        return_sequences = params.get('return_sequences', False)
        dropout = params.get('dropout', 0.0)
        bidirectional = params.get('bidirectional', False)
        
        code_parts = [f"layers.GRU({units}"]
        
        if activation != 'tanh':
            code_parts.append(f"activation='{activation}'")
        
        if return_sequences:
            code_parts.append("return_sequences=True")
        
        if dropout > 0:
            code_parts.append(f"dropout={dropout}")
        
        if is_first_layer and config.input_shape:
            input_shape_str = str(config.input_shape[1:])
            code_parts.append(f"input_shape={input_shape_str}")
        
        gru_code = f"{', '.join(code_parts)})"
        
        if bidirectional:
            return f"layers.Bidirectional({gru_code})"
        else:
            return gru_code
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        units = params.get('units', 128)
        dropout = params.get('dropout', 0.0)
        bidirectional = params.get('bidirectional', False)
        return_sequences = params.get('return_sequences', False)
        
        input_size = "# 需要根据前一层计算"
        if config.input_shape:
            input_size = config.input_shape[-1]
        
        definition = f"self.gru_{layer_index} = nn.GRU({input_size}, {units}, " \
                    f"batch_first=True, dropout={dropout}, bidirectional={bidirectional})"
        
        if return_sequences:
            forward = f"x, _ = self.gru_{layer_index}(x)"
        else:
            forward = f"x, _ = self.gru_{layer_index}(x)\n" \
                     f"        x = x[:, -1, :]"
        
        return {'definition': definition, 'forward': forward}

@register_layer("conv1d", "advanced")
class Conv1DLayer(BaseLayer):
    """一维卷积层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['filters', 'kernel_size']
        self.optional_params = {
            'strides': 1,
            'padding': 'valid',
            'activation': 'linear',
            'use_bias': True,
            'dilation_rate': 1
        }
        self.param_constraints = {
            'filters': {'type': 'range', 'min': 1, 'max': 2048},
            'kernel_size': {'type': 'range', 'min': 1, 'max': 100},
            'strides': {'type': 'range', 'min': 1, 'max': 10},
            'padding': {'type': 'choices', 'values': ['valid', 'same', 'causal']}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        if len(input_shape) != 3:  # (batch, timesteps, features)
            raise ValueError("Conv1D输入必须是3维")
        
        params = config.parameters
        filters = params.get('filters', 32)
        kernel_size = params.get('kernel_size', 3)
        strides = params.get('strides', 1)
        padding = params.get('padding', 'valid')
        
        batch, timesteps, _ = input_shape
        
        if padding == 'same':
            out_timesteps = timesteps // strides
        elif padding == 'causal':
            out_timesteps = timesteps // strides
        else:  # 'valid'
            out_timesteps = (timesteps - kernel_size) // strides + 1
        
        return (batch, out_timesteps, filters)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        filters = params.get('filters', 32)
        kernel_size = params.get('kernel_size', 3)
        strides = params.get('strides', 1)
        padding = params.get('padding', 'valid')
        activation = params.get('activation', 'linear')
        
        code_parts = [f"layers.Conv1D({filters}, {kernel_size}"]
        
        if strides != 1:
            code_parts.append(f"strides={strides}")
        
        if padding != 'valid':
            code_parts.append(f"padding='{padding}'")
        
        if activation != 'linear':
            code_parts.append(f"activation='{activation}'")
        
        if is_first_layer and config.input_shape:
            input_shape_str = str(config.input_shape[1:])
            code_parts.append(f"input_shape={input_shape_str}")
        
        return f"{', '.join(code_parts)})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        filters = params.get('filters', 32)
        kernel_size = params.get('kernel_size', 3)
        strides = params.get('strides', 1)
        padding = params.get('padding', 'valid')
        activation = params.get('activation', 'linear')
        
        in_channels = "# 需要根据前一层计算"
        if config.input_shape:
            in_channels = config.input_shape[-1]
        
        # PyTorch的padding处理
        if padding == 'same':
            padding_value = kernel_size // 2
        else:
            padding_value = 0
        
        definition = f"self.conv1d_{layer_index} = nn.Conv1d({in_channels}, {filters}, " \
                    f"{kernel_size}, stride={strides}, padding={padding_value})"
        
        forward = f"x = x.transpose(1, 2)  # (batch, features, timesteps)\n" \
                 f"        x = self.conv1d_{layer_index}(x)\n" \
                 f"        x = x.transpose(1, 2)  # (batch, timesteps, features)"
        
        if activation != 'linear':
            if activation == 'relu':
                forward += f"\n        x = F.relu(x)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("conv3d", "advanced")
class Conv3DLayer(BaseLayer):
    """三维卷积层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['filters', 'kernel_size']
        self.optional_params = {
            'strides': [1, 1, 1],
            'padding': 'valid',
            'activation': 'linear',
            'use_bias': True
        }
        self.param_constraints = {
            'filters': {'type': 'range', 'min': 1, 'max': 512},
            'kernel_size': {'type': 'shape', 'length': 3},
            'strides': {'type': 'shape', 'length': 3},
            'padding': {'type': 'choices', 'values': ['valid', 'same']}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        if len(input_shape) != 5:  # (batch, depth, height, width, channels)
            raise ValueError("Conv3D输入必须是5维")
        
        params = config.parameters
        filters = params.get('filters', 32)
        kernel_size = params.get('kernel_size', [3, 3, 3])
        strides = params.get('strides', [1, 1, 1])
        padding = params.get('padding', 'valid')
        
        batch, depth, height, width, _ = input_shape
        
        if padding == 'same':
            out_depth = depth // strides[0]
            out_height = height // strides[1]
            out_width = width // strides[2]
        else:  # 'valid'
            out_depth = (depth - kernel_size[0]) // strides[0] + 1
            out_height = (height - kernel_size[1]) // strides[1] + 1
            out_width = (width - kernel_size[2]) // strides[2] + 1
        
        return (batch, out_depth, out_height, out_width, filters)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        filters = params.get('filters', 32)
        kernel_size = params.get('kernel_size', [3, 3, 3])
        strides = params.get('strides', [1, 1, 1])
        padding = params.get('padding', 'valid')
        activation = params.get('activation', 'linear')
        
        code_parts = [f"layers.Conv3D({filters}, {kernel_size}"]
        
        if strides != [1, 1, 1]:
            code_parts.append(f"strides={strides}")
        
        if padding != 'valid':
            code_parts.append(f"padding='{padding}'")
        
        if activation != 'linear':
            code_parts.append(f"activation='{activation}'")
        
        if is_first_layer and config.input_shape:
            input_shape_str = str(config.input_shape[1:])
            code_parts.append(f"input_shape={input_shape_str}")
        
        return f"{', '.join(code_parts)})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        filters = params.get('filters', 32)
        kernel_size = params.get('kernel_size', [3, 3, 3])
        strides = params.get('strides', [1, 1, 1])
        padding = params.get('padding', 'valid')
        activation = params.get('activation', 'linear')
        
        in_channels = "# 需要根据前一层计算"
        if config.input_shape:
            in_channels = config.input_shape[-1]
        
        if padding == 'same':
            padding_value = 'same'
        else:
            padding_value = 0
        
        definition = f"self.conv3d_{layer_index} = nn.Conv3d({in_channels}, {filters}, " \
                    f"{kernel_size[0]}, stride={strides[0]}, padding={padding_value})"
        
        forward = f"x = self.conv3d_{layer_index}(x)"
        if activation != 'linear':
            if activation == 'relu':
                forward += f"\n        x = F.relu(x)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("separable_conv2d", "advanced")
class SeparableConv2DLayer(BaseLayer):
    """深度可分离卷积层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['filters', 'kernel_size']
        self.optional_params = {
            'strides': [1, 1],
            'padding': 'valid',
            'activation': 'linear',
            'use_bias': True,
            'depth_multiplier': 1
        }
        self.param_constraints = {
            'filters': {'type': 'range', 'min': 1, 'max': 2048},
            'kernel_size': {'type': 'shape', 'length': 2},
            'depth_multiplier': {'type': 'range', 'min': 1, 'max': 8}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        # 与Conv2D相同的形状计算逻辑
        if len(input_shape) != 4:
            raise ValueError("SeparableConv2D输入必须是4维")
        
        params = config.parameters
        filters = params.get('filters', 32)
        kernel_size = params.get('kernel_size', [3, 3])
        strides = params.get('strides', [1, 1])
        padding = params.get('padding', 'valid')
        
        batch, height, width, _ = input_shape
        
        if padding == 'same':
            out_height = height // strides[0]
            out_width = width // strides[1]
        else:
            out_height = (height - kernel_size[0]) // strides[0] + 1
            out_width = (width - kernel_size[1]) // strides[1] + 1
        
        return (batch, out_height, out_width, filters)
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        filters = params.get('filters', 32)
        kernel_size = params.get('kernel_size', [3, 3])
        strides = params.get('strides', [1, 1])
        padding = params.get('padding', 'valid')
        activation = params.get('activation', 'linear')
        depth_multiplier = params.get('depth_multiplier', 1)
        
        code_parts = [f"layers.SeparableConv2D({filters}, {kernel_size}"]
        
        if strides != [1, 1]:
            code_parts.append(f"strides={strides}")
        
        if padding != 'valid':
            code_parts.append(f"padding='{padding}'")
        
        if activation != 'linear':
            code_parts.append(f"activation='{activation}'")
        
        if depth_multiplier != 1:
            code_parts.append(f"depth_multiplier={depth_multiplier}")
        
        if is_first_layer and config.input_shape:
            input_shape_str = str(config.input_shape[1:])
            code_parts.append(f"input_shape={input_shape_str}")
        
        return f"{', '.join(code_parts)})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        # PyTorch没有直接的SeparableConv2D，需要手动实现
        params = config.parameters
        filters = params.get('filters', 32)
        kernel_size = params.get('kernel_size', [3, 3])
        
        in_channels = "# 需要根据前一层计算"
        if config.input_shape:
            in_channels = config.input_shape[-1]
        
        definition = f"# 深度可分离卷积需要手动实现\n" \
                    f"        self.depthwise_{layer_index} = nn.Conv2d({in_channels}, {in_channels}, " \
                    f"{kernel_size[0]}, groups={in_channels})\n" \
                    f"        self.pointwise_{layer_index} = nn.Conv2d({in_channels}, {filters}, 1)"
        
        forward = f"x = self.depthwise_{layer_index}(x)\n" \
                 f"        x = self.pointwise_{layer_index}(x)"
        
        return {'definition': definition, 'forward': forward} 