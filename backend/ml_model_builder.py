"""
ML模型构建器 - 统一的模型构建和代码生成系统
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import asdict

from ml_layers import (
    LayerRegistry, 
    LayerConfig, 
    ValidationResult,
    get_all_layers,
    get_layer_by_type
)

logger = logging.getLogger(__name__)

class ModelBuilder:
    """模型构建器主类"""
    
    def __init__(self):
        self.layers_registry = LayerRegistry
        self.supported_frameworks = ['tensorflow', 'pytorch']
    
    def get_available_layers(self) -> Dict[str, Any]:
        """获取所有可用的层信息"""
        return self.layers_registry.get_layer_info_all()
    
    def get_layer_info(self, layer_type: str) -> Optional[Dict[str, Any]]:
        """获取特定层的信息"""
        layer = self.layers_registry.get_layer(layer_type)
        if layer:
            return layer.get_layer_info()
        return None
    
    def validate_model_config(self, model_config: Dict[str, Any]) -> ValidationResult:
        """验证完整的模型配置"""
        errors = []
        warnings = []
        suggestions = []
        
        # 检查基本结构
        if 'layers' not in model_config:
            errors.append("模型配置必须包含'layers'字段")
            return ValidationResult(False, errors, warnings, suggestions)
        
        layers = model_config['layers']
        if not isinstance(layers, list) or len(layers) == 0:
            errors.append("模型必须至少包含一个层")
            return ValidationResult(False, errors, warnings, suggestions)
        
        # 验证每个层
        current_shape = model_config.get('input_shape')
        
        for i, layer_data in enumerate(layers):
            if 'type' not in layer_data:
                errors.append(f"第{i+1}层缺少'type'字段")
                continue
            
            layer_type = layer_data['type']
            layer_impl = self.layers_registry.get_layer(layer_type)
            
            if not layer_impl:
                errors.append(f"第{i+1}层: 未知的层类型 '{layer_type}'")
                continue
            
            # 创建层配置
            layer_config = LayerConfig(
                layer_type=layer_type,
                layer_id=layer_data.get('id', f'layer_{i}'),
                parameters=layer_data.get('parameters', {}),
                input_shape=current_shape,
                trainable=layer_data.get('trainable', True),
                name=layer_data.get('name')
            )
            
            # 验证层配置
            validation_result = layer_impl.validate_config(layer_config)
            
            if not validation_result.is_valid:
                for error in validation_result.errors:
                    errors.append(f"第{i+1}层({layer_type}): {error}")
            
            warnings.extend([f"第{i+1}层({layer_type}): {w}" for w in validation_result.warnings])
            suggestions.extend([f"第{i+1}层({layer_type}): {s}" for s in validation_result.suggestions])
            
            # 计算输出形状作为下一层的输入
            if current_shape:
                try:
                    current_shape = layer_impl.calculate_output_shape(current_shape, layer_config)
                except Exception as e:
                    errors.append(f"第{i+1}层({layer_type}): 形状计算错误 - {str(e)}")
                    current_shape = None
        
        # 检查模型完整性
        if not errors:
            if not current_shape:
                warnings.append("无法确定最终输出形状")
            
            # 检查是否有输出层
            last_layer_type = layers[-1].get('type', '')
            if last_layer_type not in ['dense', 'softmax', 'sigmoid']:
                suggestions.append("建议在模型末尾添加适当的输出层")
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            suggestions=suggestions
        )
    
    def build_tensorflow_model(self, model_config: Dict[str, Any]) -> Dict[str, Any]:
        """构建TensorFlow模型代码"""
        validation_result = self.validate_model_config(model_config)
        
        if not validation_result.is_valid:
            return {
                'success': False,
                'errors': validation_result.errors,
                'warnings': validation_result.warnings
            }
        
        try:
            # 生成导入语句
            imports = [
                "import tensorflow as tf",
                "from tensorflow.keras import layers, models",
                "import numpy as np"
            ]
            
            # 检查是否需要额外的导入
            layer_types = [layer.get('type') for layer in model_config['layers']]
            if any(t in ['group_normalization', 'spectral_normalization'] for t in layer_types):
                imports.append("import tensorflow_addons as tfa")
            
            # 生成模型代码
            model_code = self._generate_tensorflow_code(model_config)
            
            return {
                'success': True,
                'code': {
                    'imports': '\n'.join(imports),
                    'model_definition': model_code,
                    'complete_code': '\n\n'.join(['\n'.join(imports), model_code])
                },
                'warnings': validation_result.warnings,
                'suggestions': validation_result.suggestions
            }
            
        except Exception as e:
            logger.error(f"TensorFlow代码生成失败: {str(e)}")
            return {
                'success': False,
                'errors': [f"代码生成失败: {str(e)}"]
            }
    
    def build_pytorch_model(self, model_config: Dict[str, Any]) -> Dict[str, Any]:
        """构建PyTorch模型代码"""
        validation_result = self.validate_model_config(model_config)
        
        if not validation_result.is_valid:
            return {
                'success': False,
                'errors': validation_result.errors,
                'warnings': validation_result.warnings
            }
        
        try:
            # 生成导入语句
            imports = [
                "import torch",
                "import torch.nn as nn",
                "import torch.nn.functional as F",
                "import math"
            ]
            
            # 生成模型代码
            model_code = self._generate_pytorch_code(model_config)
            
            return {
                'success': True,
                'code': {
                    'imports': '\n'.join(imports),
                    'model_definition': model_code,
                    'complete_code': '\n\n'.join(['\n'.join(imports), model_code])
                },
                'warnings': validation_result.warnings,
                'suggestions': validation_result.suggestions
            }
            
        except Exception as e:
            logger.error(f"PyTorch代码生成失败: {str(e)}")
            return {
                'success': False,
                'errors': [f"代码生成失败: {str(e)}"]
            }
    
    def _generate_tensorflow_code(self, model_config: Dict[str, Any]) -> str:
        """生成TensorFlow模型代码"""
        layers_code = []
        input_shape = model_config.get('input_shape')
        
        for i, layer_data in enumerate(model_config['layers']):
            layer_type = layer_data['type']
            layer_impl = self.layers_registry.get_layer(layer_type)
            
            layer_config = LayerConfig(
                layer_type=layer_type,
                layer_id=layer_data.get('id', f'layer_{i}'),
                parameters=layer_data.get('parameters', {}),
                input_shape=input_shape,
                trainable=layer_data.get('trainable', True),
                name=layer_data.get('name')
            )
            
            # 生成层代码
            layer_code = layer_impl.generate_tensorflow_code(layer_config, i == 0)
            layers_code.append(f"    model.add({layer_code})")
            
            # 更新形状
            if input_shape:
                input_shape = layer_impl.calculate_output_shape(input_shape, layer_config)
        
        # 组装完整模型
        model_name = model_config.get('name', 'CustomModel')
        
        code_template = f'''def create_{model_name.lower()}():
    """
    创建{model_name}模型
    输入形状: {model_config.get('input_shape', 'Unknown')}
    """
    model = models.Sequential()
    
{chr(10).join(layers_code)}
    
    return model

# 创建模型实例
model = create_{model_name.lower()}()

# 编译模型（需要根据具体任务调整）
model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',  # 根据任务类型调整
    metrics=['accuracy']
)

# 模型摘要
model.summary()'''
        
        return code_template
    
    def _generate_pytorch_code(self, model_config: Dict[str, Any]) -> str:
        """生成PyTorch模型代码"""
        definitions = []
        forwards = []
        input_shape = model_config.get('input_shape')
        
        for i, layer_data in enumerate(model_config['layers']):
            layer_type = layer_data['type']
            layer_impl = self.layers_registry.get_layer(layer_type)
            
            layer_config = LayerConfig(
                layer_type=layer_type,
                layer_id=layer_data.get('id', f'layer_{i}'),
                parameters=layer_data.get('parameters', {}),
                input_shape=input_shape,
                trainable=layer_data.get('trainable', True),
                name=layer_data.get('name')
            )
            
            # 生成层代码
            layer_code = layer_impl.generate_pytorch_code(layer_config, i)
            
            if layer_code['definition'].strip():
                definitions.append(f"        {layer_code['definition']}")
            
            if layer_code['forward'].strip():
                forwards.append(f"        {layer_code['forward']}")
            
            # 更新形状
            if input_shape:
                input_shape = layer_impl.calculate_output_shape(input_shape, layer_config)
        
        # 组装完整模型
        model_name = model_config.get('name', 'CustomModel')
        
        code_template = f'''class {model_name}(nn.Module):
    """
    {model_name}模型
    输入形状: {model_config.get('input_shape', 'Unknown')}
    """
    
    def __init__(self):
        super({model_name}, self).__init__()
        
{chr(10).join(definitions)}
    
    def forward(self, x):
{chr(10).join(forwards)}
        return x

# 创建模型实例
model = {model_name}()

# 模型信息
def count_parameters(model):
    return sum(p.numel() for p in model.parameters() if p.requires_grad)

print(f"模型参数数量: {{count_parameters(model):,}}")
print(f"模型结构:\\n{{model}}")'''
        
        return code_template
    
    def analyze_model_complexity(self, model_config: Dict[str, Any]) -> Dict[str, Any]:
        """分析模型复杂度"""
        validation_result = self.validate_model_config(model_config)
        
        if not validation_result.is_valid:
            return {
                'success': False,
                'errors': validation_result.errors
            }
        
        try:
            layers = model_config['layers']
            total_params = 0
            layer_info = []
            current_shape = model_config.get('input_shape')
            
            for i, layer_data in enumerate(layers):
                layer_type = layer_data['type']
                layer_impl = self.layers_registry.get_layer(layer_type)
                
                layer_config = LayerConfig(
                    layer_type=layer_type,
                    layer_id=layer_data.get('id', f'layer_{i}'),
                    parameters=layer_data.get('parameters', {}),
                    input_shape=current_shape,
                    trainable=layer_data.get('trainable', True),
                    name=layer_data.get('name')
                )
                
                # 计算输出形状
                if current_shape:
                    output_shape = layer_impl.calculate_output_shape(current_shape, layer_config)
                else:
                    output_shape = None
                
                # 估算参数数量
                params = self._estimate_layer_parameters(layer_type, layer_config, current_shape, output_shape)
                total_params += params
                
                layer_info.append({
                    'layer_index': i,
                    'layer_type': layer_type,
                    'input_shape': current_shape,
                    'output_shape': output_shape,
                    'parameters': params,
                    'trainable': layer_config.trainable
                })
                
                current_shape = output_shape
            
            return {
                'success': True,
                'analysis': {
                    'total_parameters': total_params,
                    'total_layers': len(layers),
                    'input_shape': model_config.get('input_shape'),
                    'output_shape': current_shape,
                    'layer_details': layer_info
                }
            }
            
        except Exception as e:
            logger.error(f"模型复杂度分析失败: {str(e)}")
            return {
                'success': False,
                'errors': [f"分析失败: {str(e)}"]
            }
    
    def _estimate_layer_parameters(self, layer_type: str, config: LayerConfig, 
                                 input_shape: Optional[Tuple], output_shape: Optional[Tuple]) -> int:
        """估算层的参数数量"""
        if not input_shape or not output_shape:
            return 0
        
        params = config.parameters
        
        if layer_type == 'dense':
            units = params.get('units', 128)
            use_bias = params.get('use_bias', True)
            input_dim = input_shape[-1] if len(input_shape) > 0 else 0
            return input_dim * units + (units if use_bias else 0)
        
        elif layer_type in ['conv2d', 'conv1d']:
            filters = params.get('filters', 32)
            kernel_size = params.get('kernel_size', [3, 3] if layer_type == 'conv2d' else 3)
            use_bias = params.get('use_bias', True)
            
            if layer_type == 'conv2d':
                input_channels = input_shape[-1] if len(input_shape) > 0 else 0
                kernel_params = kernel_size[0] * kernel_size[1] * input_channels * filters
            else:  # conv1d
                input_channels = input_shape[-1] if len(input_shape) > 0 else 0
                kernel_params = kernel_size * input_channels * filters
            
            return kernel_params + (filters if use_bias else 0)
        
        elif layer_type in ['batch_normalization', 'layer_normalization']:
            # 通常有scale和shift参数
            if output_shape:
                return output_shape[-1] * 2
        
        elif layer_type in ['lstm', 'gru']:
            units = params.get('units', 128)
            input_dim = input_shape[-1] if len(input_shape) > 0 else 0
            
            if layer_type == 'lstm':
                # LSTM有4组权重矩阵
                return 4 * (input_dim * units + units * units + units)
            else:  # GRU
                # GRU有3组权重矩阵
                return 3 * (input_dim * units + units * units + units)
        
        # 其他层类型通常没有参数或参数很少
        return 0

# 创建全局模型构建器实例
model_builder = ModelBuilder() 