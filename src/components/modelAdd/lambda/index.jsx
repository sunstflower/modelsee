import React, { useEffect } from 'react';
import { useStoreActions, useStoreState } from 'easy-peasy';
import NodeContainer from '../NodeContainer';
import InputField from '../InputField';

const FIELD_TOOLTIPS = {
  function: "自定义函数 - 定义要应用的Lambda函数，如 'lambda x: x * 2'",
  output_shape: "输出形状 - 指定Lambda层的输出形状，可选",
  mask: "掩码函数 - 自定义掩码函数，可选",
  arguments: "函数参数 - 传递给Lambda函数的额外参数",
  name: "层名称 - 该层的自定义名称，用于模型可视化"
};

const Lambda = ({ id, data }) => {
  const updateNodeData = useStoreActions(actions => actions.updateNodeData);
  const nodes = useStoreState(state => state.nodes);
  
  const nodeData = nodes.find(node => node.id === id)?.data || {};

  const defaultConfig = {
    function: 'lambda x: x',
    output_shape: null,
    mask: null,
    arguments: {},
    name: null
  };

  useEffect(() => {
    const newData = { ...defaultConfig, ...nodeData };
    if (JSON.stringify(newData) !== JSON.stringify(nodeData)) {
      updateNodeData({ id, data: newData });
    }
  }, []);

  const handleInputChange = (field, value) => {
    updateNodeData({
      id,
      data: { ...nodeData, [field]: value || defaultConfig[field] }
    });
  };

  const commonFunctions = [
    { value: 'lambda x: x', label: '恒等函数 (x)' },
    { value: 'lambda x: x * 2', label: '乘以2 (x * 2)' },
    { value: 'lambda x: x ** 2', label: '平方 (x²)' },
    { value: 'lambda x: tf.reduce_mean(x, axis=1)', label: '按轴求均值' },
    { value: 'lambda x: tf.reduce_sum(x, axis=1)', label: '按轴求和' },
    { value: 'lambda x: tf.expand_dims(x, axis=-1)', label: '扩展维度' },
    { value: 'lambda x: tf.squeeze(x)', label: '压缩维度' },
    { value: 'lambda x: tf.nn.l2_normalize(x, axis=-1)', label: 'L2归一化' }
  ];

  const basicConfig = (
    <div className="space-y-3">
      <InputField
        label="Lambda函数"
        type="select"
        value={nodeData.function || defaultConfig.function}
        onChange={(value) => handleInputChange('function', value)}
        options={commonFunctions}
        tooltip={FIELD_TOOLTIPS.function}
      />
      
      <InputField
        label="自定义函数"
        type="textarea"
        value={nodeData.function || defaultConfig.function}
        onChange={(value) => handleInputChange('function', value)}
        placeholder="lambda x: x"
        rows="3"
        tooltip="输入自定义Lambda函数表达式"
      />
      
      <div className="p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">Lambda层</h4>
        <p className="text-sm text-gray-700">
          允许在模型中嵌入任意的Python表达式作为层
        </p>
      </div>
    </div>
  );

  const advancedConfig = (
    <div className="space-y-3">
      <InputField
        label="输出形状（可选）"
        type="text"
        value={nodeData.output_shape || ''}
        onChange={(value) => handleInputChange('output_shape', value || null)}
        placeholder="例如: (None, 128)"
        tooltip={FIELD_TOOLTIPS.output_shape}
      />
      
      <InputField
        label="掩码函数（可选）"
        type="text"
        value={nodeData.mask || ''}
        onChange={(value) => handleInputChange('mask', value || null)}
        placeholder="lambda inputs, mask: mask"
        tooltip={FIELD_TOOLTIPS.mask}
      />
      
      <InputField
        label="层名称（可选）"
        type="text"
        value={nodeData.name || ''}
        onChange={(value) => handleInputChange('name', value || null)}
        placeholder="自定义层名称"
        tooltip={FIELD_TOOLTIPS.name}
      />
      
      <div className="mt-4 space-y-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">使用场景</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 自定义数学运算</li>
            <li>• 张量形状变换</li>
            <li>• 特征工程</li>
            <li>• 原型开发</li>
          </ul>
        </div>
        
        <div className="p-3 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">注意事项</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 使用TensorFlow操作确保兼容性</li>
            <li>• 避免在生产环境中过度使用</li>
            <li>• 考虑性能影响</li>
            <li>• 确保函数可序列化</li>
          </ul>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">常用TensorFlow操作</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• tf.reduce_mean() - 求均值</li>
            <li>• tf.reduce_sum() - 求和</li>
            <li>• tf.expand_dims() - 扩展维度</li>
            <li>• tf.squeeze() - 压缩维度</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <NodeContainer
      id={id}
      title="Lambda"
      type="custom"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
};

export default Lambda; 