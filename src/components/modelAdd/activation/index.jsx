import React, { useEffect, useRef } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 配置字段提示信息
const FIELD_TOOLTIPS = {
  activation: "激活函数类型，为网络引入非线性。不同的激活函数适用于不同的场景。",
  alpha: "LeakyReLU的负斜率参数，控制负值区域的斜率。",
  max_value: "ReLU的最大值限制，防止激活值过大。",
  negative_slope: "负斜率参数，用于某些激活函数的负值区域。",
  threshold: "阈值参数，用于某些激活函数的阈值设置。"
};

// 激活函数选项及其描述
const ACTIVATION_OPTIONS = [
  { 
    value: 'relu', 
    label: 'ReLU', 
    description: '修正线性单元，最常用的激活函数，计算简单且有效缓解梯度消失',
    params: ['max_value', 'negative_slope', 'threshold']
  },
  { 
    value: 'leaky_relu', 
    label: 'Leaky ReLU', 
    description: '改进的ReLU，负值区域有小斜率，缓解神经元死亡问题',
    params: ['alpha']
  },
  { 
    value: 'elu', 
    label: 'ELU', 
    description: '指数线性单元，负值区域平滑，有助于加速学习',
    params: ['alpha']
  },
  { 
    value: 'prelu', 
    label: 'PReLU', 
    description: '参数化ReLU，负斜率可学习',
    params: []
  },
  { 
    value: 'sigmoid', 
    label: 'Sigmoid', 
    description: 'S型函数，输出范围(0,1)，常用于二分类输出层',
    params: []
  },
  { 
    value: 'tanh', 
    label: 'Tanh', 
    description: '双曲正切函数，输出范围(-1,1)，零中心化',
    params: []
  },
  { 
    value: 'softmax', 
    label: 'Softmax', 
    description: '多分类激活函数，输出概率分布，和为1',
    params: []
  },
  { 
    value: 'swish', 
    label: 'Swish', 
    description: '自门控激活函数，在深层网络中表现优异',
    params: []
  },
  { 
    value: 'gelu', 
    label: 'GELU', 
    description: '高斯误差线性单元，Transformer中常用',
    params: []
  },
  { 
    value: 'mish', 
    label: 'Mish', 
    description: '平滑的激活函数，在某些任务中超越ReLU',
    params: []
  }
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

function ActivationNode({ data }) {
  const { activationConfigs, updateActivationConfig } = useStore();
  const configIndex = data.index || 0;
  const isInitialized = useRef(false);
  
  // 根据节点类型确定默认激活函数
  const getDefaultActivationType = () => {
    // 如果data中有type信息，使用它来设置默认激活函数
    if (data.type && ACTIVATION_OPTIONS.find(opt => opt.value === data.type)) {
      return data.type;
    }
    // 如果data中有activationType信息
    if (data.activationType && ACTIVATION_OPTIONS.find(opt => opt.value === data.activationType)) {
      return data.activationType;
    }
    // 默认返回relu
    return 'relu';
  };
  
  // 初始化配置
  useEffect(() => {
    if (isInitialized.current || (activationConfigs[configIndex] && activationConfigs[configIndex].activation)) {
      isInitialized.current = true;
      return;
    }
    
    isInitialized.current = true;
    
    const defaultActivationType = getDefaultActivationType();
    
    // 根据后端数据结构设置默认值
    const defaultConfig = {
      activation: defaultActivationType,
      alpha: 0.3,
      max_value: null,
      negative_slope: 0.0,
      threshold: 0.0
    };
    
    updateActivationConfig(configIndex, defaultConfig);
    console.log(`Activation层 ${configIndex} 设置默认值:`, defaultConfig);
  }, [configIndex, activationConfigs, updateActivationConfig, data.type, data.activationType]);
  
  const config = activationConfigs[configIndex] || {
    activation: getDefaultActivationType(),
    alpha: 0.3,
    max_value: null,
    negative_slope: 0.0,
    threshold: 0.0
  };

  const handleConfigChange = (field, value) => {
    updateActivationConfig(configIndex, { [field]: value });
  };

  const selectedActivation = ACTIVATION_OPTIONS.find(opt => opt.value === config.activation) || ACTIVATION_OPTIONS[0];

  // 基本配置项
  const basicConfig = (
    <div className="space-y-4">
      <InputField 
        label="激活函数类型" 
        tooltip={FIELD_TOOLTIPS.activation}
        required
      >
        <select
          value={config.activation || getDefaultActivationType()}
          onChange={(e) => handleConfigChange('activation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {ACTIVATION_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>{selectedActivation.label}:</strong> {selectedActivation.description}
          </p>
        </div>
      </InputField>
    </div>
  );

  // 高级配置项 - 根据选择的激活函数显示相关参数
  const advancedConfig = (
    <div className="space-y-4">
      {selectedActivation.params.includes('alpha') && (
        <InputField 
          label="Alpha参数" 
          tooltip={FIELD_TOOLTIPS.alpha}
        >
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={config.alpha || 0.3}
            onChange={(e) => handleConfigChange('alpha', parseFloat(e.target.value) || 0.3)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="0.3"
          />
        </InputField>
      )}

      {selectedActivation.params.includes('max_value') && (
        <InputField 
          label="最大值限制" 
          tooltip={FIELD_TOOLTIPS.max_value}
        >
          <input
            type="number"
            min="0"
            value={config.max_value || ''}
            onChange={(e) => {
              const value = e.target.value;
              handleConfigChange('max_value', value ? parseFloat(value) : null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="无限制"
          />
        </InputField>
      )}

      {selectedActivation.params.includes('negative_slope') && (
        <InputField 
          label="负斜率" 
          tooltip={FIELD_TOOLTIPS.negative_slope}
        >
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={config.negative_slope || 0.0}
            onChange={(e) => handleConfigChange('negative_slope', parseFloat(e.target.value) || 0.0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="0.0"
          />
        </InputField>
      )}

      {selectedActivation.params.includes('threshold') && (
        <InputField 
          label="阈值" 
          tooltip={FIELD_TOOLTIPS.threshold}
        >
          <input
            type="number"
            step="0.1"
            value={config.threshold || 0.0}
            onChange={(e) => handleConfigChange('threshold', parseFloat(e.target.value) || 0.0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="0.0"
          />
        </InputField>
      )}

      {selectedActivation.params.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4">
          该激活函数无需额外参数配置
        </div>
      )}
    </div>
  );

  return (
    <NodeContainer 
      title="Activation Layer" 
      backgroundColor="white"
      borderColor="pink-200"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
}

export default ActivationNode; 