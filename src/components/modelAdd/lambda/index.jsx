import React, { useEffect, useRef } from 'react';
import NodeContainer from '../NodeContainer';
import InputField from '../InputField';
import useStore from '@/store';

const FIELD_TOOLTIPS = {
  function: "自定义函数 - 定义要应用的Lambda函数，如 'lambda x: x * 2'",
  output_shape: "输出形状 - 指定Lambda层的输出形状，可选",
  mask: "掩码函数 - 自定义掩码函数，可选",
  arguments: "函数参数 - 传递给Lambda函数的额外参数",
  name: "层名称 - 该层的自定义名称，用于模型可视化"
};

function LambdaNode({ data }) {
  // 由于store中还没有lambdaConfigs，我们暂时使用本地状态
  const [config, setConfig] = React.useState({
    function: 'lambda x: x',
    output_shape: null,
    mask: null,
    arguments: {},
    name: null
  });

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
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
        tooltip={FIELD_TOOLTIPS.function}
        required
      >
        <select
          value={config.function}
          onChange={(e) => handleConfigChange('function', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {commonFunctions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </InputField>
      
      <InputField
        label="自定义函数"
        tooltip="输入自定义Lambda函数表达式"
      >
        <textarea
          value={config.function}
          onChange={(e) => handleConfigChange('function', e.target.value)}
          placeholder="lambda x: x"
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </InputField>
      
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
        tooltip={FIELD_TOOLTIPS.output_shape}
      >
        <input
          type="text"
          value={config.output_shape || ''}
          onChange={(e) => handleConfigChange('output_shape', e.target.value || null)}
          placeholder="例如: (None, 128)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </InputField>
      
      <InputField
        label="层名称（可选）"
        tooltip={FIELD_TOOLTIPS.name}
      >
        <input
          type="text"
          value={config.name || ''}
          onChange={(e) => handleConfigChange('name', e.target.value || null)}
          placeholder="自定义层名称"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </InputField>
      
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
      </div>
    </div>
  );

  return (
    <NodeContainer
      title="Lambda"
      type="custom"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
}

export default LambdaNode; 