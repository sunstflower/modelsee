import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  rate: "丢弃率，介于0和1之间的浮点数。表示输入单元被设置为0的比例",
  noise_shape: "1D整数张量，表示将与输入相乘的二进制dropout掩码的形状",
  seed: "用作随机种子的Python整数。确保结果的可重复性"
};

// 输入字段组件
const InputField = ({ label, value, onChange, type = "text", min, max, step, tooltip }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700" title={tooltip}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
);

// 滑块组件
const SliderField = ({ label, value, onChange, min, max, step, tooltip }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700" title={tooltip}>
        {label}
      </label>
      <div className="flex items-center space-x-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= min && val <= max) {
                onChange(val);
              }
            }}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">
            {Math.round(value * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// 数组输入组件
const ArrayInput = ({ label, value, onChange, tooltip }) => {
  const [inputValue, setInputValue] = useState(
    Array.isArray(value) ? value.join(', ') : ''
  );

  const handleChange = (newValue) => {
    setInputValue(newValue);
    try {
      if (newValue.trim() === '') {
        onChange(null);
      } else {
        const array = newValue.split(',').map(s => {
          const num = parseInt(s.trim());
          return isNaN(num) ? null : num;
        }).filter(n => n !== null);
        onChange(array.length > 0 ? array : null);
      }
    } catch (e) {
      // 忽略解析错误
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700" title={tooltip}>
        {label}
      </label>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="如: 1, 2 或留空表示None"
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <div className="text-xs text-gray-500">
        当前: {Array.isArray(value) ? `[${value.join(', ')}]` : 'None'}
      </div>
    </div>
  );
};

function AlphaDropoutNode({ data }) {
  const { alphaDropoutConfigs, updateAlphaDropoutConfig } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    rate: 0.1,
    noise_shape: null,
    seed: null
  };
  
  const config = alphaDropoutConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateAlphaDropoutConfig(configIndex, { ...config, ...updates });
  };

  // 基本配置
  const basicConfig = (
    <div className="space-y-4">
      <SliderField
        label="丢弃率"
        value={config.rate}
        onChange={(newRate) => updateConfig({ rate: newRate })}
        min={0}
        max={0.9}
        step={0.01}
        tooltip={FIELD_TOOLTIPS.rate}
      />
      
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-blue-800 mb-2">Alpha Dropout 特点</div>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 保持输入的均值和方差不变</li>
          <li>• 适用于自归一化神经网络 (SELU激活)</li>
          <li>• 随机将输入设置为负饱和值而不是0</li>
          <li>• 确保激活函数的自归一化特性</li>
        </ul>
      </div>
    </div>
  );

  // 高级配置
  const advancedConfig = (
    <div className="space-y-4">
      <ArrayInput
        label="噪声形状"
        value={config.noise_shape}
        onChange={(newShape) => updateConfig({ noise_shape: newShape })}
        tooltip={FIELD_TOOLTIPS.noise_shape}
      />
      
      <InputField
        label="随机种子"
        type="number"
        value={config.seed || ''}
        onChange={(e) => {
          const value = e.target.value;
          updateConfig({ 
            seed: value === '' ? null : parseInt(value) 
          });
        }}
        min="0"
        max="2147483647"
        tooltip={FIELD_TOOLTIPS.seed}
      />
      
      <div className="bg-amber-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-amber-800 mb-2">使用建议</div>
        <ul className="text-xs text-amber-700 space-y-1">
          <li>• 通常与SELU激活函数配合使用</li>
          <li>• 丢弃率建议在0.05-0.1之间</li>
          <li>• 适用于深度自归一化网络</li>
          <li>• 不需要批量归一化或其他归一化技术</li>
        </ul>
      </div>
    </div>
  );

  return (
    <NodeContainer
      title="AlphaDropout"
      borderColor="border-indigo-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-indigo-50 p-2 rounded">
        <div className="font-medium text-indigo-700 mb-1">Alpha Dropout层</div>
        <div>保持均值和方差的Dropout变体，适用于自归一化神经网络</div>
        <div className="mt-1">
          当前配置: {Math.round(config.rate * 100)}% 丢弃率
          {config.noise_shape && `, 噪声形状[${config.noise_shape.join(',')}]`}
          {config.seed && `, 种子${config.seed}`}
        </div>
      </div>
    </NodeContainer>
  );
}

export default AlphaDropoutNode; 