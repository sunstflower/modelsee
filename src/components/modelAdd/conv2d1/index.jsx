import React, { useEffect, useRef, useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 配置字段提示信息
const FIELD_TOOLTIPS = {
  filters: "卷积核数量，决定输出特征图的深度。通常从32开始，逐层递增到512。",
  kernel_size: "卷积核大小，通常使用3x3或5x5。较小的核可以捕获细节，较大的核可以捕获更大的特征。",
  strides: "卷积步长，控制卷积核移动的步长。步长为1保持尺寸，步长为2会减半尺寸。",
  padding: "填充方式。'valid'不填充，'same'填充保持输出尺寸与输入相同。",
  activation: "激活函数，为网络引入非线性。ReLU是卷积层的标准选择。",
  use_bias: "是否使用偏置项。在有批归一化时通常可以禁用偏置。",
  kernel_initializer: "权重初始化方法。He初始化适用于ReLU激活函数。",
  bias_initializer: "偏置初始化方法。通常使用零初始化。",
  dilation_rate: "膨胀率，控制卷积核的感受野。增加膨胀率可以在不增加参数的情况下扩大感受野。"
};

// 配置选项
const ACTIVATION_OPTIONS = [
  { value: 'linear', label: 'Linear (线性)' },
  { value: 'relu', label: 'ReLU' },
  { value: 'sigmoid', label: 'Sigmoid' },
  { value: 'tanh', label: 'Tanh' },
  { value: 'leaky_relu', label: 'Leaky ReLU' },
  { value: 'elu', label: 'ELU' }
];

const PADDING_OPTIONS = [
  { value: 'valid', label: 'Valid (无填充)' },
  { value: 'same', label: 'Same (保持尺寸)' }
];

const INITIALIZER_OPTIONS = [
  { value: 'glorot_uniform', label: 'Glorot Uniform' },
  { value: 'glorot_normal', label: 'Glorot Normal' },
  { value: 'he_uniform', label: 'He Uniform' },
  { value: 'he_normal', label: 'He Normal' },
  { value: 'zeros', label: 'Zeros' },
  { value: 'ones', label: 'Ones' }
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

// 尺寸输入组件
const SizeInput = ({ value, onChange, placeholder = "[3, 3]" }) => {
  const handleChange = (e) => {
    const val = e.target.value;
    try {
      // 尝试解析为数组
      if (val.includes(',') || val.includes('[')) {
        const parsed = JSON.parse(val.replace(/[^\d,\[\]]/g, ''));
        onChange(Array.isArray(parsed) ? parsed : [parsed, parsed]);
      } else {
        // 单个数字，转换为 [n, n]
        const num = parseInt(val);
        onChange(isNaN(num) ? [3, 3] : [num, num]);
      }
    } catch {
      // 解析失败，使用默认值
      onChange([3, 3]);
    }
  };

  const displayValue = Array.isArray(value) ? `[${value.join(', ')}]` : value;

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
    />
  );
};

function Conv2DNode({ data }) {
  const { conv2dConfigs, updateConv2dConfig } = useStore();
  const configIndex = data.index || 0;
  const isInitialized = useRef(false);
  const [extraRaw, setExtraRaw] = useState('');
  const [extraError, setExtraError] = useState('');
  
  // 初始化配置
  useEffect(() => {
    if (isInitialized.current || (conv2dConfigs[configIndex] && conv2dConfigs[configIndex].filters)) {
      isInitialized.current = true;
      return;
    }
    
    isInitialized.current = true;
    
    // 根据后端数据结构设置默认值
    const defaultConfig = {
      filters: 32,
      kernel_size: [3, 3],
      strides: [1, 1],
      padding: 'valid',
      activation: 'relu',
      use_bias: true,
      kernel_initializer: 'glorot_uniform',
      bias_initializer: 'zeros',
      dilation_rate: [1, 1]
    };
    
    updateConv2dConfig(configIndex, defaultConfig);
    console.log(`Conv2D层 ${configIndex} 设置默认值:`, defaultConfig);
  }, [configIndex, conv2dConfigs, updateConv2dConfig]);
  
  const config = conv2dConfigs[configIndex] || {
    filters: 32,
    kernel_size: [3, 3],
    strides: [1, 1],
    padding: 'valid',
    activation: 'relu',
    use_bias: true,
    kernel_initializer: 'glorot_uniform',
    bias_initializer: 'zeros',
    dilation_rate: [1, 1],
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
    updateConv2dConfig(configIndex, { [field]: value });
  };

  // 基本配置项
  const basicConfig = (
    <div className="space-y-4">
      <InputField 
        label="卷积核数量" 
        tooltip={FIELD_TOOLTIPS.filters}
        required
      >
        <input
          type="number"
          min="1"
          max="2048"
          value={config.filters || 32}
          onChange={(e) => handleConfigChange('filters', parseInt(e.target.value, 10) || 32)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="32"
        />
      </InputField>

      <InputField 
        label="卷积核大小" 
        tooltip={FIELD_TOOLTIPS.kernel_size}
        required
      >
        <SizeInput
          value={config.kernel_size || [3, 3]}
          onChange={(value) => handleConfigChange('kernel_size', value)}
          placeholder="[3, 3]"
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
        label="步长" 
        tooltip={FIELD_TOOLTIPS.strides}
      >
        <SizeInput
          value={config.strides || [1, 1]}
          onChange={(value) => handleConfigChange('strides', value)}
          placeholder="[1, 1]"
        />
      </InputField>

      <InputField 
        label="填充方式" 
        tooltip={FIELD_TOOLTIPS.padding}
      >
        <select
          value={config.padding || 'valid'}
          onChange={(e) => handleConfigChange('padding', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {PADDING_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </InputField>

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
        label="膨胀率" 
        tooltip={FIELD_TOOLTIPS.dilation_rate}
      >
        <SizeInput
          value={config.dilation_rate || [1, 1]}
          onChange={(value) => handleConfigChange('dilation_rate', value)}
          placeholder="[1, 1]"
        />
      </InputField>

      <div className="space-y-2">
        <label className="flex items-center text-sm font-medium text-gray-700">
          额外TF/Keras参数 (JSON)
        </label>
        <textarea
          rows={6}
          value={extraRaw}
          onChange={(e) => setExtraRaw(e.target.value)}
          placeholder='{"padding":"same","kernelRegularizer":{"type":"l2","l2":0.0005}}'
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
        />
        {extraError && <div className="text-xs text-red-600">{extraError}</div>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              try {
                const parsed = extraRaw ? JSON.parse(extraRaw) : {};
                updateConv2dConfig(configIndex, { extraConfig: parsed });
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
      title="Conv2D Layer" 
      backgroundColor="white"
      borderColor="green-200"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
}

export default Conv2DNode;





