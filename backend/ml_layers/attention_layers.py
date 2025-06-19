"""
注意力机制层组件 - MultiHeadAttention, SelfAttention等
"""

from typing import Dict, Any, Tuple
from .base_layer import BaseLayer, LayerConfig, ValidationResult, register_layer

@register_layer("multi_head_attention", "attention")
class MultiHeadAttentionLayer(BaseLayer):
    """多头注意力层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['num_heads', 'key_dim']
        self.optional_params = {
            'value_dim': None,
            'dropout': 0.0,
            'use_bias': True,
            'output_shape': None,
            'attention_axes': None
        }
        self.param_constraints = {
            'num_heads': {'type': 'range', 'min': 1, 'max': 32},
            'key_dim': {'type': 'range', 'min': 8, 'max': 512},
            'dropout': {'type': 'range', 'min': 0.0, 'max': 1.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        result = self.validate_parameters(config.parameters)
        
        # 验证key_dim能被num_heads整除
        key_dim = config.parameters.get('key_dim', 64)
        num_heads = config.parameters.get('num_heads', 8)
        
        if key_dim % num_heads != 0:
            result.errors.append(f"key_dim ({key_dim}) 必须能被 num_heads ({num_heads}) 整除")
        
        return result
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        # 多头注意力通常保持输入形状
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        num_heads = params.get('num_heads', 8)
        key_dim = params.get('key_dim', 64)
        dropout = params.get('dropout', 0.0)
        
        code_parts = [f"layers.MultiHeadAttention(num_heads={num_heads}, key_dim={key_dim}"]
        
        if dropout > 0:
            code_parts.append(f"dropout={dropout}")
        
        return f"{', '.join(code_parts)})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        num_heads = params.get('num_heads', 8)
        key_dim = params.get('key_dim', 64)
        dropout = params.get('dropout', 0.0)
        
        embed_dim = key_dim * num_heads
        
        definition = f"self.multihead_attn_{layer_index} = nn.MultiheadAttention(" \
                    f"embed_dim={embed_dim}, num_heads={num_heads}, dropout={dropout}, batch_first=True)"
        
        forward = f"x, _ = self.multihead_attn_{layer_index}(x, x, x)  # self-attention"
        
        return {'definition': definition, 'forward': forward}

@register_layer("self_attention", "attention")
class SelfAttentionLayer(BaseLayer):
    """自注意力层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['units']
        self.optional_params = {
            'use_scale': True,
            'dropout': 0.0
        }
        self.param_constraints = {
            'units': {'type': 'range', 'min': 8, 'max': 512},
            'dropout': {'type': 'range', 'min': 0.0, 'max': 1.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        units = params.get('units', 64)
        use_scale = params.get('use_scale', True)
        
        # TensorFlow需要自定义实现
        return f"# 自注意力层需要自定义实现\n" \
               f"        # units={units}, use_scale={use_scale}"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        units = params.get('units', 64)
        dropout = params.get('dropout', 0.0)
        
        input_dim = "# 需要根据前一层计算"
        if config.input_shape:
            input_dim = config.input_shape[-1]
        
        definition = f"# 自注意力层\n" \
                    f"        self.query_{layer_index} = nn.Linear({input_dim}, {units})\n" \
                    f"        self.key_{layer_index} = nn.Linear({input_dim}, {units})\n" \
                    f"        self.value_{layer_index} = nn.Linear({input_dim}, {units})\n" \
                    f"        self.attention_dropout_{layer_index} = nn.Dropout({dropout})"
        
        forward = f"# 自注意力计算\n" \
                 f"        Q = self.query_{layer_index}(x)\n" \
                 f"        K = self.key_{layer_index}(x)\n" \
                 f"        V = self.value_{layer_index}(x)\n" \
                 f"        attention_scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt({units})\n" \
                 f"        attention_weights = F.softmax(attention_scores, dim=-1)\n" \
                 f"        attention_weights = self.attention_dropout_{layer_index}(attention_weights)\n" \
                 f"        x = torch.matmul(attention_weights, V)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("additive_attention", "attention")
class AdditiveAttentionLayer(BaseLayer):
    """加性注意力层（Bahdanau注意力）"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['units']
        self.optional_params = {
            'use_scale': False,
            'dropout': 0.0
        }
        self.param_constraints = {
            'units': {'type': 'range', 'min': 8, 'max': 512},
            'dropout': {'type': 'range', 'min': 0.0, 'max': 1.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        params = config.parameters
        units = params.get('units', 64)
        
        return f"layers.AdditiveAttention(use_scale={params.get('use_scale', False)})"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        units = params.get('units', 64)
        dropout = params.get('dropout', 0.0)
        
        input_dim = "# 需要根据前一层计算"
        if config.input_shape:
            input_dim = config.input_shape[-1]
        
        definition = f"# 加性注意力层\n" \
                    f"        self.W_q_{layer_index} = nn.Linear({input_dim}, {units})\n" \
                    f"        self.W_k_{layer_index} = nn.Linear({input_dim}, {units})\n" \
                    f"        self.W_v_{layer_index} = nn.Linear({units}, 1)\n" \
                    f"        self.attention_dropout_{layer_index} = nn.Dropout({dropout})"
        
        forward = f"# 加性注意力计算\n" \
                 f"        query = self.W_q_{layer_index}(x)\n" \
                 f"        key = self.W_k_{layer_index}(x)\n" \
                 f"        score = self.W_v_{layer_index}(torch.tanh(query + key))\n" \
                 f"        attention_weights = F.softmax(score, dim=1)\n" \
                 f"        attention_weights = self.attention_dropout_{layer_index}(attention_weights)\n" \
                 f"        x = torch.sum(attention_weights * x, dim=1, keepdim=True)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("attention_pooling", "attention")
class AttentionPoolingLayer(BaseLayer):
    """注意力池化层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = []
        self.optional_params = {
            'pool_size': 2,
            'dropout': 0.0
        }
        self.param_constraints = {
            'pool_size': {'type': 'range', 'min': 1, 'max': 10},
            'dropout': {'type': 'range', 'min': 0.0, 'max': 1.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        if len(input_shape) < 2:
            return input_shape
        
        pool_size = config.parameters.get('pool_size', 2)
        # 简化计算，假设在时间维度池化
        return (input_shape[0], input_shape[1] // pool_size, input_shape[-1])
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        # TensorFlow需要自定义实现
        return "# 注意力池化层需要自定义实现"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        pool_size = params.get('pool_size', 2)
        dropout = params.get('dropout', 0.0)
        
        input_dim = "# 需要根据前一层计算"
        if config.input_shape:
            input_dim = config.input_shape[-1]
        
        definition = f"# 注意力池化层\n" \
                    f"        self.attention_weights_{layer_index} = nn.Linear({input_dim}, 1)\n" \
                    f"        self.pool_dropout_{layer_index} = nn.Dropout({dropout})"
        
        forward = f"# 注意力池化\n" \
                 f"        batch_size, seq_len, hidden_dim = x.shape\n" \
                 f"        # 重塑为池化组\n" \
                 f"        x_reshaped = x.view(batch_size, seq_len // {pool_size}, {pool_size}, hidden_dim)\n" \
                 f"        # 计算注意力权重\n" \
                 f"        attn_scores = self.attention_weights_{layer_index}(x_reshaped)\n" \
                 f"        attn_weights = F.softmax(attn_scores, dim=2)\n" \
                 f"        attn_weights = self.pool_dropout_{layer_index}(attn_weights)\n" \
                 f"        # 加权求和\n" \
                 f"        x = torch.sum(attn_weights * x_reshaped, dim=2)"
        
        return {'definition': definition, 'forward': forward}

@register_layer("cross_attention", "attention")
class CrossAttentionLayer(BaseLayer):
    """交叉注意力层"""
    
    def __init__(self, layer_type: str, category: str, description: str):
        super().__init__(layer_type, category, description)
        self.required_params = ['units']
        self.optional_params = {
            'dropout': 0.0,
            'use_bias': True
        }
        self.param_constraints = {
            'units': {'type': 'range', 'min': 8, 'max': 512},
            'dropout': {'type': 'range', 'min': 0.0, 'max': 1.0}
        }
    
    def validate_config(self, config: LayerConfig) -> ValidationResult:
        return self.validate_parameters(config.parameters)
    
    def calculate_output_shape(self, input_shape: Tuple[int, ...], config: LayerConfig) -> Tuple[int, ...]:
        return input_shape
    
    def generate_tensorflow_code(self, config: LayerConfig, is_first_layer: bool = False) -> str:
        # TensorFlow需要自定义实现
        return "# 交叉注意力层需要自定义实现"
    
    def generate_pytorch_code(self, config: LayerConfig, layer_index: int) -> Dict[str, str]:
        params = config.parameters
        units = params.get('units', 64)
        dropout = params.get('dropout', 0.0)
        
        input_dim = "# 需要根据前一层计算"
        if config.input_shape:
            input_dim = config.input_shape[-1]
        
        definition = f"# 交叉注意力层\n" \
                    f"        self.cross_query_{layer_index} = nn.Linear({input_dim}, {units})\n" \
                    f"        self.cross_key_{layer_index} = nn.Linear({input_dim}, {units})\n" \
                    f"        self.cross_value_{layer_index} = nn.Linear({input_dim}, {units})\n" \
                    f"        self.cross_dropout_{layer_index} = nn.Dropout({dropout})"
        
        forward = f"# 交叉注意力计算（需要两个输入）\n" \
                 f"        # 假设 x 是查询，需要额外的键值输入\n" \
                 f"        Q = self.cross_query_{layer_index}(x)\n" \
                 f"        # K, V 需要来自其他输入\n" \
                 f"        # K = self.cross_key_{layer_index}(other_input)\n" \
                 f"        # V = self.cross_value_{layer_index}(other_input)\n" \
                 f"        # 注意：交叉注意力需要额外的输入处理"
        
        return {'definition': definition, 'forward': forward} 