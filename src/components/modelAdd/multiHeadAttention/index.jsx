import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  num_heads: "注意力头的数量。必须能整除key_dim",
  key_dim: "每个注意力头的查询和键向量的大小",
  value_dim: "每个注意力头的值向量的大小。如果为None，则使用key_dim",
  dropout: "应用于注意力分数的dropout率",
  use_bias: "是否在dense层中使用偏置",
  output_shape: "输出张量的预期形状，不包括批次维度",
  attention_axes: "应用注意力的轴。None表示对除批次和特征轴外的所有轴应用注意力",
  kernel_initializer: "dense层权重的初始化器",
  bias_initializer: "dense层偏置的初始化器"
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

// 选择组件
const SelectField = ({ label, value, onChange, options, tooltip }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700" title={tooltip}>
      {label}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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

// 切换开关组件
const ToggleSwitch = ({ label, checked, onChange, tooltip }) => (
  <div className="flex items-center justify-between">
    <label className="text-sm font-medium text-gray-700" title={tooltip}>
      {label}
    </label>
    <div className="relative inline-block w-10 align-middle select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}>
        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`} />
      </div>
    </div>
  </div>
);

function MultiHeadAttentionNode({ data }) {
  const { multiHeadAttentionConfigs, updateMultiHeadAttentionConfig } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    num_heads: 8,
    key_dim: 64,
    value_dim: null,
    dropout: 0.0,
    use_bias: true,
    output_shape: null,
    attention_axes: null,
    kernel_initializer: 'glorot_uniform',
    bias_initializer: 'zeros'
  };
  
  const config = multiHeadAttentionConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateMultiHeadAttentionConfig(configIndex, { ...config, ...updates });
  };

  // 验证头数和维度的兼容性
  const isValidDimension = config.key_dim % config.num_heads === 0;

  // 基本配置
  const basicConfig = (
    <div className="space-y-4">
      <InputField
        label="注意力头数"
        type="number"
        value={config.num_heads}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value) && value >= 1 && value <= 32) {
            updateConfig({ num_heads: value });
          }
        }}
        min="1"
        max="32"
        tooltip={FIELD_TOOLTIPS.num_heads}
      />
      
      <InputField
        label="键/查询维度"
        type="number"
        value={config.key_dim}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value) && value >= 8 && value <= 2048) {
            updateConfig({ key_dim: value });
          }
        }}
        min="8"
        max="2048"
        tooltip={FIELD_TOOLTIPS.key_dim}
      />
      
      {!isValidDimension && (
        <div className="bg-red-50 border border-red-200 p-2 rounded">
          <div className="text-sm text-red-700">
            ⚠️ key_dim ({config.key_dim}) 必须能被 num_heads ({config.num_heads}) 整除
          </div>
        </div>
      )}
      
      <InputField
        label="值维度"
        type="number"
        value={config.value_dim || ''}
        onChange={(e) => {
          const value = e.target.value;
          updateConfig({ 
            value_dim: value === '' ? null : parseInt(value) 
          });
        }}
        min="8"
        max="2048"
        tooltip={FIELD_TOOLTIPS.value_dim}
      />
      
      <SliderField
        label="Dropout率"
        value={config.dropout}
        onChange={(newDropout) => updateConfig({ dropout: newDropout })}
        min={0}
        max={0.5}
        step={0.01}
        tooltip={FIELD_TOOLTIPS.dropout}
      />
    </div>
  );

  // 高级配置
  const advancedConfig = (
    <div className="space-y-4">
      <ToggleSwitch
        label="使用偏置"
        checked={config.use_bias}
        onChange={(e) => updateConfig({ use_bias: e.target.checked })}
        tooltip={FIELD_TOOLTIPS.use_bias}
      />
      
      <SelectField
        label="权重初始化器"
        value={config.kernel_initializer}
        onChange={(e) => updateConfig({ kernel_initializer: e.target.value })}
        options={[
          { value: 'glorot_uniform', label: 'Glorot Uniform' },
          { value: 'glorot_normal', label: 'Glorot Normal' },
          { value: 'he_uniform', label: 'He Uniform' },
          { value: 'he_normal', label: 'He Normal' },
          { value: 'random_uniform', label: 'Random Uniform' },
          { value: 'random_normal', label: 'Random Normal' }
        ]}
        tooltip={FIELD_TOOLTIPS.kernel_initializer}
      />
      
      <SelectField
        label="偏置初始化器"
        value={config.bias_initializer}
        onChange={(e) => updateConfig({ bias_initializer: e.target.value })}
        options={[
          { value: 'zeros', label: 'Zeros' },
          { value: 'ones', label: 'Ones' },
          { value: 'random_uniform', label: 'Random Uniform' },
          { value: 'random_normal', label: 'Random Normal' }
        ]}
        tooltip={FIELD_TOOLTIPS.bias_initializer}
      />
      
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-blue-800 mb-2">注意力机制说明</div>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 多头注意力允许模型关注不同位置的信息</li>
          <li>• 每个头学习不同的表示子空间</li>
          <li>• 适用于序列到序列任务和Transformer模型</li>
          <li>• key_dim必须能被num_heads整除</li>
        </ul>
      </div>
    </div>
  );

  return (
    <NodeContainer
      title="MultiHeadAttention"
      borderColor="border-pink-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-pink-50 p-2 rounded">
        <div className="font-medium text-pink-700 mb-1">多头注意力层</div>
        <div>Transformer架构的核心组件，实现多头自注意力机制</div>
        <div className="mt-1">
          当前配置: {config.num_heads}个头, 键维度{config.key_dim}
          {config.value_dim && `, 值维度${config.value_dim}`}
          {config.dropout > 0 && `, dropout${Math.round(config.dropout * 100)}%`}
        </div>
        {isValidDimension && (
          <div className="text-xs text-pink-600 mt-1">
            每个头的维度: {config.key_dim / config.num_heads}
          </div>
        )}
      </div>
    </NodeContainer>
  );
}

export default MultiHeadAttentionNode; 