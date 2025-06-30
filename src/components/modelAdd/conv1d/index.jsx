import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  filters: "输出空间的维度（即卷积中输出滤波器的数量）。决定了特征图的数量",
  kernel_size: "一维卷积核的长度。指定卷积核沿时间轴的大小",
  strides: "卷积的步长。指定卷积核移动的步长，影响输出序列的长度",
  padding: "填充方式。'valid'表示不填充，'same'表示填充以保持输出长度，'causal'表示因果填充",
  activation: "要使用的激活函数。如果为None，则不应用激活函数",
  use_bias: "是否使用偏置向量。通常建议保持启用",
  kernel_initializer: "卷积核权重矩阵的初始化器",
  bias_initializer: "偏置向量的初始化器",
  dilation_rate: "用于膨胀卷积的膨胀率。控制卷积核元素之间的间距"
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

function Conv1DNode({ data }) {
  const { conv1dConfigs, updateConv1dConfig } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    filters: 32,
    kernel_size: 3,
    strides: 1,
    padding: 'valid',
    activation: 'linear',
    use_bias: true,
    kernel_initializer: 'glorot_uniform',
    bias_initializer: 'zeros',
    dilation_rate: 1
  };
  
  const config = conv1dConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateConv1dConfig(configIndex, { ...config, ...updates });
  };

  // 基本配置
  const basicConfig = (
    <div className="space-y-4">
      <InputField
        label="滤波器数量"
        type="number"
        value={config.filters}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value) && value >= 1 && value <= 2048) {
            updateConfig({ filters: value });
          }
        }}
        min="1"
        max="2048"
        tooltip={FIELD_TOOLTIPS.filters}
      />
      
      <InputField
        label="卷积核大小"
        type="number"
        value={config.kernel_size}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value) && value >= 1 && value <= 100) {
            updateConfig({ kernel_size: value });
          }
        }}
        min="1"
        max="100"
        tooltip={FIELD_TOOLTIPS.kernel_size}
      />
      
      <SelectField
        label="激活函数"
        value={config.activation}
        onChange={(e) => updateConfig({ activation: e.target.value })}
        options={[
          { value: 'linear', label: 'Linear (无激活)' },
          { value: 'relu', label: 'ReLU' },
          { value: 'tanh', label: 'Tanh' },
          { value: 'sigmoid', label: 'Sigmoid' },
          { value: 'leaky_relu', label: 'Leaky ReLU' },
          { value: 'elu', label: 'ELU' }
        ]}
        tooltip={FIELD_TOOLTIPS.activation}
      />
    </div>
  );

  // 高级配置
  const advancedConfig = (
    <div className="space-y-4">
      <InputField
        label="步长"
        type="number"
        value={config.strides}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value) && value >= 1 && value <= 10) {
            updateConfig({ strides: value });
          }
        }}
        min="1"
        max="10"
        tooltip={FIELD_TOOLTIPS.strides}
      />
      
      <SelectField
        label="填充方式"
        value={config.padding}
        onChange={(e) => updateConfig({ padding: e.target.value })}
        options={[
          { value: 'valid', label: 'Valid (不填充)' },
          { value: 'same', label: 'Same (保持长度)' },
          { value: 'causal', label: 'Causal (因果填充)' }
        ]}
        tooltip={FIELD_TOOLTIPS.padding}
      />
      
      <InputField
        label="膨胀率"
        type="number"
        value={config.dilation_rate}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value) && value >= 1 && value <= 10) {
            updateConfig({ dilation_rate: value });
          }
        }}
        min="1"
        max="10"
        tooltip={FIELD_TOOLTIPS.dilation_rate}
      />
      
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
    </div>
  );

  return (
    <NodeContainer
      title="Conv1D"
      borderColor="border-orange-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-orange-50 p-2 rounded">
        <div className="font-medium text-orange-700 mb-1">一维卷积层</div>
        <div>用于处理序列数据的卷积层，常用于时间序列和文本处理</div>
        <div className="mt-1">
          当前配置: {config.filters}个滤波器, 核大小{config.kernel_size}, {config.padding}填充
        </div>
      </div>
    </NodeContainer>
  );
}

export default Conv1DNode; 