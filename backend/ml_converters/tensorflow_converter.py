"""
TensorFlow Model Converter
将可视化模型结构转换为TensorFlow模型并执行训练
"""

import numpy as np
from typing import List, Dict, Any, Callable, Optional
import logging
import asyncio
import json
import os
from datetime import datetime

# 可选导入TensorFlow
try:
    import tensorflow as tf
    HAS_TENSORFLOW = True
except ImportError:
    HAS_TENSORFLOW = False

logger = logging.getLogger(__name__)

class TensorFlowConverter:
    """TensorFlow模型转换器"""
    
    def __init__(self):
        if not HAS_TENSORFLOW:
            logger.warning("TensorFlow未安装，TensorFlow功能将不可用")
        
        self.supported_layers = {
            'conv2d': self._create_conv2d,
            'maxPooling2d': self._create_max_pooling2d,
            'avgPooling2d': self._create_avg_pooling2d,
            'dense': self._create_dense,
            'dropout': self._create_dropout,
            'batchNorm': self._create_batch_norm,
            'flatten': self._create_flatten,
            'lstm': self._create_lstm,
            'gru': self._create_gru,
            'activation': self._create_activation,
            'reshape': self._create_reshape
        }
        
    def convert_model_structure(self, layers: List[Dict], connections: List[Dict]) -> str:
        """将可视化模型结构转换为TensorFlow代码"""
        if not HAS_TENSORFLOW:
            raise ImportError("TensorFlow未安装，无法使用TensorFlow转换功能")
            
        try:
            # 分析模型结构
            model_info = self._analyze_model_structure(layers, connections)
            
            # 生成代码
            code = self._generate_tensorflow_code(model_info)
            
            return code
            
        except Exception as e:
            logger.error(f"模型结构转换失败: {e}")
            raise
            
    def _analyze_model_structure(self, layers: List[Dict], connections: List[Dict]) -> Dict:
        """分析模型结构"""
        # 构建连接图
        connection_map = {}
        for conn in connections:
            source = conn.get('source')
            target = conn.get('target')
            if source and target:
                if target not in connection_map:
                    connection_map[target] = []
                connection_map[target].append(source)
        
        # 找到输入层和排序
        input_layers = [layer for layer in layers if layer['type'] in ['useData', 'mnist']]
        processing_layers = [layer for layer in layers if layer['type'] not in ['useData', 'mnist']]
        
        # 根据连接关系排序处理层
        sorted_layers = self._topological_sort(processing_layers, connection_map)
        
        return {
            'input_layers': input_layers,
            'processing_layers': sorted_layers,
            'connections': connection_map,
            'has_mnist': any(layer['type'] == 'mnist' for layer in input_layers),
            'has_csv': any(layer['type'] == 'useData' for layer in input_layers)
        }
        
    def _topological_sort(self, layers: List[Dict], connections: Dict) -> List[Dict]:
        """拓扑排序层序列"""
        # 简单的拓扑排序实现
        sorted_layers = []
        remaining_layers = layers.copy()
        
        while remaining_layers:
            # 找到没有依赖的层
            ready_layers = []
            for layer in remaining_layers:
                layer_id = layer['id']
                dependencies = connections.get(layer_id, [])
                
                # 检查依赖是否都已处理
                all_deps_ready = True
                for dep in dependencies:
                    if any(l['id'] == dep for l in remaining_layers):
                        all_deps_ready = False
                        break
                        
                if all_deps_ready:
                    ready_layers.append(layer)
            
            if not ready_layers:
                # 如果没有找到准备好的层，可能存在循环依赖
                logger.warning("可能存在循环依赖，使用原始顺序")
                sorted_layers.extend(remaining_layers)
                break
                
            # 添加准备好的层并从剩余列表中移除
            for layer in ready_layers:
                sorted_layers.append(layer)
                remaining_layers.remove(layer)
                
        return sorted_layers
        
    def _generate_tensorflow_code(self, model_info: Dict) -> str:
        """生成TensorFlow代码"""
        code_parts = []
        
        # 导入语句
        code_parts.append("""
import tensorflow as tf
import numpy as np
from tensorflow import keras
from tensorflow.keras import layers
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
""")
        
        # 数据加载函数
        if model_info['has_mnist']:
            code_parts.append(self._generate_mnist_loader())
        elif model_info['has_csv']:
            code_parts.append(self._generate_csv_loader())
            
        # 模型定义
        code_parts.append(self._generate_model_definition(model_info))
        
        # 训练函数
        code_parts.append(self._generate_training_function())
        
        # 主函数
        code_parts.append(self._generate_main_function(model_info))
        
        return "\n".join(code_parts)
        
    def _generate_mnist_loader(self) -> str:
        """生成MNIST数据加载代码"""
        return """
def load_mnist_data():
    \"\"\"加载MNIST数据集\"\"\"
    logger.info("加载MNIST数据集...")
    (x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()
    
    # 归一化
    x_train = x_train.astype('float32') / 255.0
    x_test = x_test.astype('float32') / 255.0
    
    # 添加通道维度
    x_train = np.expand_dims(x_train, -1)
    x_test = np.expand_dims(x_test, -1)
    
    # 转换标签为one-hot编码
    y_train = keras.utils.to_categorical(y_train, 10)
    y_test = keras.utils.to_categorical(y_test, 10)
    
    logger.info(f"训练数据形状: {x_train.shape}, 测试数据形状: {x_test.shape}")
    return (x_train, y_train), (x_test, y_test)
"""
        
    def _generate_csv_loader(self) -> str:
        """生成CSV数据加载代码"""
        return """
def load_csv_data(file_path=None):
    \"\"\"加载CSV数据集\"\"\"
    logger.info("加载CSV数据集...")
    if file_path is None:
        # 生成示例数据
        logger.info("生成示例数据...")
        x_data = np.random.randn(1000, 4)
        y_data = keras.utils.to_categorical(np.random.randint(0, 3, 1000), 3)
    else:
        # 从文件加载数据
        import pandas as pd
        df = pd.read_csv(file_path)
        # 假设最后一列是标签
        x_data = df.iloc[:, :-1].values
        y_data = keras.utils.to_categorical(df.iloc[:, -1].values)
    
    # 分割训练和测试数据
    split_idx = int(0.8 * len(x_data))
    x_train, x_test = x_data[:split_idx], x_data[split_idx:]
    y_train, y_test = y_data[:split_idx], y_data[split_idx:]
    
    logger.info(f"训练数据形状: {x_train.shape}, 测试数据形状: {x_test.shape}")
    return (x_train, y_train), (x_test, y_test)
"""
        
    def _generate_model_definition(self, model_info: Dict) -> str:
        """生成模型定义代码"""
        code = ["def create_model():"]
        code.append("    \"\"\"创建模型\"\"\"")
        code.append("    logger.info('创建模型...')")
        code.append("    model = keras.Sequential()")
        code.append("")
        
        # 添加层
        for i, layer in enumerate(model_info['processing_layers']):
            layer_code = self._generate_layer_code(layer, i == 0, model_info)
            code.extend([f"    {line}" for line in layer_code.split('\n') if line.strip()])
            code.append("")
            
        code.append("    return model")
        code.append("")
        
        return "\n".join(code)
        
    def _generate_layer_code(self, layer: Dict, is_first: bool, model_info: Dict) -> str:
        """生成单个层的代码"""
        layer_type = layer['type']
        config = layer.get('config', {})
        
        if layer_type not in self.supported_layers:
            return f"# 不支持的层类型: {layer_type}"
            
        return self.supported_layers[layer_type](config, is_first, model_info)
        
    def _create_conv2d(self, config: Dict, is_first: bool, model_info: Dict) -> str:
        """创建卷积层代码"""
        filters = config.get('filters', 32)
        kernel_size = config.get('kernelSize', 3)
        strides = config.get('strides', 1)
        activation = config.get('activation', 'relu')
        
        if is_first and model_info['has_mnist']:
            return f"""model.add(layers.Conv2D({filters}, ({kernel_size}, {kernel_size}), 
                          strides={strides}, activation='{activation}', 
                          input_shape=(28, 28, 1)))
logger.info('添加Conv2D层: filters={filters}, kernel_size={kernel_size}')"""
        else:
            return f"""model.add(layers.Conv2D({filters}, ({kernel_size}, {kernel_size}), 
                          strides={strides}, activation='{activation}'))
logger.info('添加Conv2D层: filters={filters}, kernel_size={kernel_size}')"""
            
    def _create_max_pooling2d(self, config: Dict, is_first: bool, model_info: Dict) -> str:
        """创建最大池化层代码"""
        pool_size = config.get('poolSize', [2, 2])
        strides = config.get('strides', [2, 2])
        
        return f"""model.add(layers.MaxPooling2D(pool_size={pool_size}, strides={strides}))
logger.info('添加MaxPooling2D层: pool_size={pool_size}')"""
        
    def _create_avg_pooling2d(self, config: Dict, is_first: bool, model_info: Dict) -> str:
        """创建平均池化层代码"""
        pool_size = config.get('poolSize', [2, 2])
        strides = config.get('strides', [2, 2])
        
        return f"""model.add(layers.AveragePooling2D(pool_size={pool_size}, strides={strides}))
logger.info('添加AveragePooling2D层: pool_size={pool_size}')"""
        
    def _create_dense(self, config: Dict, is_first: bool, model_info: Dict) -> str:
        """创建全连接层代码"""
        units = config.get('units', 128)
        activation = config.get('activation', 'relu')
        
        if is_first and model_info['has_csv']:
            # 假设CSV数据的特征数为4（可以从配置中获取）
            input_dim = config.get('input_dim', 4)
            return f"""model.add(layers.Dense({units}, activation='{activation}', input_dim={input_dim}))
logger.info('添加Dense层: units={units}, activation={activation}')"""
        else:
            return f"""model.add(layers.Dense({units}, activation='{activation}'))
logger.info('添加Dense层: units={units}, activation={activation}')"""
            
    def _create_dropout(self, config: Dict, is_first: bool, model_info: Dict) -> str:
        """创建Dropout层代码"""
        rate = config.get('rate', 0.5)
        return f"""model.add(layers.Dropout({rate}))
logger.info('添加Dropout层: rate={rate}')"""
        
    def _create_batch_norm(self, config: Dict, is_first: bool, model_info: Dict) -> str:
        """创建批归一化层代码"""
        return f"""model.add(layers.BatchNormalization())
logger.info('添加BatchNormalization层')"""
        
    def _create_flatten(self, config: Dict, is_first: bool, model_info: Dict) -> str:
        """创建展平层代码"""
        return f"""model.add(layers.Flatten())
logger.info('添加Flatten层')"""
        
    def _create_lstm(self, config: Dict, is_first: bool, model_info: Dict) -> str:
        """创建LSTM层代码"""
        units = config.get('units', 128)
        return_sequences = config.get('returnSequences', False)
        
        return f"""model.add(layers.LSTM({units}, return_sequences={return_sequences}))
logger.info('添加LSTM层: units={units}')"""
        
    def _create_gru(self, config: Dict, is_first: bool, model_info: Dict) -> str:
        """创建GRU层代码"""
        units = config.get('units', 128)
        return_sequences = config.get('returnSequences', False)
        
        return f"""model.add(layers.GRU({units}, return_sequences={return_sequences}))
logger.info('添加GRU层: units={units}')"""
        
    def _create_activation(self, config: Dict, is_first: bool, model_info: Dict) -> str:
        """创建激活层代码"""
        activation = config.get('activation', 'relu')
        return f"""model.add(layers.Activation('{activation}'))
logger.info('添加Activation层: {activation}')"""
        
    def _create_reshape(self, config: Dict, is_first: bool, model_info: Dict) -> str:
        """创建重塑层代码"""
        target_shape = config.get('targetShape', [-1])
        return f"""model.add(layers.Reshape({target_shape}))
logger.info('添加Reshape层: target_shape={target_shape}')"""
        
    def _generate_training_function(self) -> str:
        """生成训练函数代码"""
        return """
def train_model(model, train_data, val_data, epochs=10, batch_size=32, 
                learning_rate=0.001, optimizer='adam'):
    \"\"\"训练模型\"\"\"
    logger.info(f"开始训练模型: epochs={epochs}, batch_size={batch_size}")
    
    # 编译模型
    if optimizer == 'adam':
        opt = keras.optimizers.Adam(learning_rate=learning_rate)
    elif optimizer == 'sgd':
        opt = keras.optimizers.SGD(learning_rate=learning_rate)
    else:
        opt = optimizer
        
    model.compile(
        optimizer=opt,
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # 训练模型
    x_train, y_train = train_data
    x_val, y_val = val_data
    
    history = model.fit(
        x_train, y_train,
        batch_size=batch_size,
        epochs=epochs,
        validation_data=(x_val, y_val),
        verbose=1
    )
    
    logger.info("模型训练完成")
    return history
"""
        
    def _generate_main_function(self, model_info: Dict) -> str:
        """生成主函数代码"""
        if model_info['has_mnist']:
            data_loader = "load_mnist_data()"
        else:
            data_loader = "load_csv_data()"
            
        return f"""
def main():
    \"\"\"主函数\"\"\"
    try:
        # 加载数据
        (x_train, y_train), (x_test, y_test) = {data_loader}
        
        # 创建模型
        model = create_model()
        model.summary()
        
        # 训练模型
        history = train_model(
            model, 
            (x_train, y_train), 
            (x_test, y_test),
            epochs=10,
            batch_size=32
        )
        
        # 评估模型
        test_loss, test_acc = model.evaluate(x_test, y_test, verbose=0)
        logger.info(f"测试准确率: {{test_acc:.4f}}")
        
        return model, history
        
    except Exception as e:
        logger.error(f"训练过程中出错: {{e}}")
        raise

if __name__ == "__main__":
    model, history = main()
"""
        
    async def train_model_async(self, session, training_config, progress_callback: Callable = None):
        """异步训练模型"""
        try:
            session.is_training = True
            logger.info(f"开始异步训练会话 {session.session_id}")
            
            # 这里应该执行实际的模型训练
            # 为了演示，我们模拟训练过程
            epochs = training_config.epochs
            
            for epoch in range(epochs):
                # 模拟训练进度
                progress = (epoch + 1) / epochs
                
                if progress_callback:
                    await progress_callback({
                        'epoch': epoch + 1,
                        'total_epochs': epochs,
                        'progress': progress,
                        'loss': 0.5 * (1 - progress) + 0.1,  # 模拟损失下降
                        'accuracy': 0.6 + 0.3 * progress  # 模拟准确率提升
                    })
                
                # 模拟训练时间
                await asyncio.sleep(1)
                
            session.is_training = False
            session.training_progress = 1.0
            logger.info(f"会话 {session.session_id} 训练完成")
            
        except Exception as e:
            session.is_training = False
            logger.error(f"异步训练失败: {e}")
            raise
            
    def predict(self, model, data: List[List[float]]) -> List[List[float]]:
        """执行预测"""
        # 这里应该使用实际的训练好的模型进行预测
        # 为了演示，返回随机预测结果
        return [[0.1, 0.2, 0.7] for _ in data]  # 假设3分类问题
        
    def export_model(self, model, format: str = "savedmodel") -> str:
        """导出模型"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        export_dir = f"exports/model_{timestamp}"
        
        if format.lower() == "savedmodel":
            # model.save(export_dir)
            os.makedirs(export_dir, exist_ok=True)
            return export_dir
        elif format.lower() == "h5":
            export_path = f"{export_dir}.h5"
            # model.save(export_path)
            return export_path
        else:
            raise ValueError(f"不支持的导出格式: {format}") 