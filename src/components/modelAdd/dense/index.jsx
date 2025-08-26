import React, { useEffect, useRef, useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 配置字段提示信息
const FIELD_TOOLTIPS = {
  units: "神经元数量，决定该层的输出维度。输出层通常设置为类别数量，隐藏层建议128-512之间。",
  activation: "激活函数，为网络引入非线性。ReLU适用于隐藏层，Softmax适用于多分类输出层。",
  use_bias: "是否使用偏置项。偏置项可以帮助模型更好地拟合数据，通常建议保持启用。",
  kernel_initializer: "权重初始化方法。Glorot Uniform适用于大多数情况，He初始化适用于ReLU激活函数。",
  bias_initializer: "偏置初始化方法。通常使用零初始化。",
  kernel_regularizer: "权重正则化，防止过拟合。L1正则化产生稀疏权重，L2正则化使权重平滑。",
  bias_regularizer: "偏置正则化，通常不需要设置。",
  activity_regularizer: "激活值正则化，限制层输出的大小。"
};

// 配置选项
const ACTIVATION_OPTIONS = [
  { value: 'linear', label: 'Linear (线性)' },
  { value: 'relu', label: 'ReLU' },
  { value: 'sigmoid', label: 'Sigmoid' },
  { value: 'tanh', label: 'Tanh' },
  { value: 'softmax', label: 'Softmax' },
  { value: 'leaky_relu', label: 'Leaky ReLU' },
  { value: 'elu', label: 'ELU' },
  { value: 'selu', label: 'SELU' }
];

const INITIALIZER_OPTIONS = [
  { value: 'glorot_uniform', label: 'Glorot Uniform' },
  { value: 'glorot_normal', label: 'Glorot Normal' },
  { value: 'he_uniform', label: 'He Uniform' },
  { value: 'he_normal', label: 'He Normal' },
  { value: 'zeros', label: 'Zeros' },
  { value: 'ones', label: 'Ones' },
  { value: 'random_uniform', label: 'Random Uniform' },
  { value: 'random_normal', label: 'Random Normal' }
];

const REGULARIZER_OPTIONS = [
  { value: null, label: '无' },
  { value: 'l1', label: 'L1正则化' },
  { value: 'l2', label: 'L2正则化' },
  { value: 'l1_l2', label: 'L1+L2正则化' }
];

// 输入字段组件
const InputField = ({ label, tooltip, children, required = false }) => (
  <div className="space-y-2">
    <label className="flex items-center text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
      <div className="group relative ml-2">
        <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-64 z-10">
          {tooltip}
        </div>
      </div>
    </label>
    {children}
  </div>
);

function DenseNode({ data }) {
  const { denseConfigs, updateDenseConfig } = useStore();
  const configIndex = data.index || 0;
  const isInitialized = useRef(false);
  const [extraRaw, setExtraRaw] = useState('');
  const [extraError, setExtraError] = useState('');
  
  // 初始化配置
  useEffect(() => {
    if (isInitialized.current || (denseConfigs[configIndex] && denseConfigs[configIndex].units)) {
      isInitialized.current = true;
      return;
    }
    
    isInitialized.current = true;
    
    // 根据后端数据结构设置默认值
    const isOutputLayer = data.isOutput || false;
    const defaultConfig = {
      units: isOutputLayer ? 10 : 128,
      activation: isOutputLayer ? 'softmax' : 'relu',
      use_bias: true,
      kernel_initializer: 'glorot_uniform',
      bias_initializer: 'zeros',
      kernel_regularizer: null,
      bias_regularizer: null,
      activity_regularizer: null
    };
    
    updateDenseConfig(configIndex, defaultConfig);
    console.log(`Dense层 ${configIndex} 设置默认值:`, defaultConfig);
  }, [configIndex, denseConfigs, updateDenseConfig, data.isOutput]);
  
  const config = denseConfigs[configIndex] || {
    units: 128,
    activation: 'relu',
    use_bias: true,
    kernel_initializer: 'glorot_uniform',
    bias_initializer: 'zeros',
    kernel_regularizer: null,
    bias_regularizer: null,
    activity_regularizer: null,
    extraConfig: {}
  };

  useEffect(() => {
    try {
      setExtraRaw(JSON.stringify(config.extraConfig || {}, null, 2));
      setExtraError('');
    } catch {
      setExtraRaw('{}');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configIndex]);

  const handleConfigChange = (field, value) => {
    updateDenseConfig(configIndex, { [field]: value });
  };

  // 基本配置项
  const basicConfig = (
    <div className="space-y-4">
      <InputField 
        label="神经元数量" 
        tooltip={FIELD_TOOLTIPS.units}
        required
      >
        <input
          type="number"
          min="1"
          max="10000"
          value={config.units || 128}
          onChange={(e) => handleConfigChange('units', parseInt(e.target.value, 10) || 128)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="128"
        />
      </InputField>

      <InputField 
        label="激活函数" 
        tooltip={FIELD_TOOLTIPS.activation}
        required
      >
        <select
          value={config.activation || 'relu'}
          onChange={(e) => handleConfigChange('activation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {ACTIVATION_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </InputField>
    </div>
  );

  // 高级配置项
  const advancedConfig = (
    <div className="space-y-4">
      <InputField 
        label="使用偏置" 
        tooltip={FIELD_TOOLTIPS.use_bias}
      >
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={config.use_bias !== false}
            onChange={(e) => handleConfigChange('use_bias', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-600">启用偏置项</span>
        </div>
      </InputField>

      <InputField 
        label="权重初始化" 
        tooltip={FIELD_TOOLTIPS.kernel_initializer}
      >
        <select
          value={config.kernel_initializer || 'glorot_uniform'}
          onChange={(e) => handleConfigChange('kernel_initializer', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {INITIALIZER_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </InputField>

      <InputField 
        label="偏置初始化" 
        tooltip={FIELD_TOOLTIPS.bias_initializer}
      >
        <select
          value={config.bias_initializer || 'zeros'}
          onChange={(e) => handleConfigChange('bias_initializer', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {INITIALIZER_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </InputField>

      <InputField 
        label="权重正则化" 
        tooltip={FIELD_TOOLTIPS.kernel_regularizer}
      >
        <select
          value={config.kernel_regularizer || ''}
          onChange={(e) => handleConfigChange('kernel_regularizer', e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {REGULARIZER_OPTIONS.map(option => (
            <option key={option.value || 'none'} value={option.value || ''}>
              {option.label}
            </option>
          ))}
        </select>
      </InputField>

      <InputField 
        label="偏置正则化" 
        tooltip={FIELD_TOOLTIPS.bias_regularizer}
      >
        <select
          value={config.bias_regularizer || ''}
          onChange={(e) => handleConfigChange('bias_regularizer', e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {REGULARIZER_OPTIONS.map(option => (
            <option key={option.value || 'none'} value={option.value || ''}>
              {option.label}
            </option>
          ))}
        </select>
      </InputField>

      <InputField 
        label="激活正则化" 
        tooltip={FIELD_TOOLTIPS.activity_regularizer}
      >
        <select
          value={config.activity_regularizer || ''}
          onChange={(e) => handleConfigChange('activity_regularizer', e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {REGULARIZER_OPTIONS.map(option => (
            <option key={option.value || 'none'} value={option.value || ''}>
              {option.label}
            </option>
          ))}
        </select>
      </InputField>

      <div className="space-y-2">
        <label className="flex items-center text-sm font-medium text-gray-700">
          额外TF/Keras参数 (JSON)
        </label>
        <textarea
          rows={6}
          value={extraRaw}
          onChange={(e) => setExtraRaw(e.target.value)}
          placeholder='{"name":"dense_1","kernelRegularizer":{"type":"l2","l2":0.0005}}'
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
        />
        {extraError && <div className="text-xs text-red-600">{extraError}</div>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              try {
                const parsed = extraRaw ? JSON.parse(extraRaw) : {};
                updateDenseConfig(configIndex, { extraConfig: parsed });
                setExtraError('');
              } catch (e) {
                setExtraError('JSON 解析失败');
              }
            }}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            保存额外参数
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <NodeContainer 
      title="Dense Layer" 
      backgroundColor="white"
      borderColor="red-200"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
}

export default DenseNode;



