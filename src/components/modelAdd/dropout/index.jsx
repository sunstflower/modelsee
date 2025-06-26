import React, { useEffect, useRef } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 配置字段提示信息
const FIELD_TOOLTIPS = {
  rate: "丢弃率，训练时随机将输入单元设置为0的比例。0表示不丢弃，1表示全部丢弃。通常设置为0.2-0.5。",
  noise_shape: "噪声形状，指定哪些维度应该独立丢弃。None表示每个元素独立丢弃。",
  seed: "随机种子，用于确保结果可重现。None表示使用随机种子。"
};

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

function DropoutNode({ data }) {
  const { dropoutConfigs, updateDropoutConfig } = useStore();
  const configIndex = data.index || 0;
  const isInitialized = useRef(false);
  
  // 初始化配置
  useEffect(() => {
    if (isInitialized.current || (dropoutConfigs[configIndex] && dropoutConfigs[configIndex].rate !== undefined)) {
      isInitialized.current = true;
      return;
    }
    
    isInitialized.current = true;
    
    // 根据后端数据结构设置默认值
    const defaultConfig = {
      rate: 0.2,
      noise_shape: null,
      seed: null
    };
    
    updateDropoutConfig(configIndex, defaultConfig);
    console.log(`Dropout层 ${configIndex} 设置默认值:`, defaultConfig);
  }, [configIndex, dropoutConfigs, updateDropoutConfig]);
  
  const config = dropoutConfigs[configIndex] || {
    rate: 0.2,
    noise_shape: null,
    seed: null
  };

  const handleConfigChange = (field, value) => {
    updateDropoutConfig(configIndex, { [field]: value });
  };

  // 基本配置项
  const basicConfig = (
    <div className="space-y-4">
      <InputField 
        label="丢弃率" 
        tooltip={FIELD_TOOLTIPS.rate}
        required
      >
        <div className="space-y-2">
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={config.rate || 0.2}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0 && value <= 1) {
                handleConfigChange('rate', value);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="0.2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0 (无丢弃)</span>
            <span>当前: {(config.rate * 100).toFixed(1)}%</span>
            <span>1 (全部丢弃)</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={config.rate || 0.2}
            onChange={(e) => handleConfigChange('rate', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </InputField>
    </div>
  );

  // 高级配置项
  const advancedConfig = (
    <div className="space-y-4">
      <InputField 
        label="噪声形状" 
        tooltip={FIELD_TOOLTIPS.noise_shape}
      >
        <input
          type="text"
          value={config.noise_shape ? JSON.stringify(config.noise_shape) : ''}
          onChange={(e) => {
            const value = e.target.value.trim();
            if (value === '') {
              handleConfigChange('noise_shape', null);
            } else {
              try {
                const parsed = JSON.parse(value);
                handleConfigChange('noise_shape', parsed);
              } catch {
                // 忽略无效的JSON
              }
            }
          }}
          placeholder="null 或 [1, 1] 等"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        <div className="text-xs text-gray-500">
          留空表示每个元素独立丢弃
        </div>
      </InputField>

      <InputField 
        label="随机种子" 
        tooltip={FIELD_TOOLTIPS.seed}
      >
        <input
          type="number"
          value={config.seed || ''}
          onChange={(e) => {
            const value = e.target.value;
            handleConfigChange('seed', value ? parseInt(value, 10) : null);
          }}
          placeholder="留空使用随机种子"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        <div className="text-xs text-gray-500">
          设置种子可确保结果可重现
        </div>
      </InputField>
    </div>
  );

  return (
    <NodeContainer 
      title="Dropout Layer" 
      backgroundColor="white"
      borderColor="blue-200"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
}

export default DropoutNode; 