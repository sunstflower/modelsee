import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  filters: "输出空间的维度（即卷积中输出滤波器的数量）。决定了特征图的数量",
  kernel_size: "三维卷积核的尺寸。可以是单个整数或3个整数的元组 [深度, 高度, 宽度]",
  strides: "卷积的步长。指定卷积核在三个维度上移动的步长",
  padding: "填充方式。'valid'表示不填充，'same'表示填充以保持输出尺寸",
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

// 三维尺寸输入组件
const Size3DInput = ({ label, value, onChange, tooltip }) => {
  const handleSizeChange = (index, newValue) => {
    const newSize = [...value];
    newSize[index] = parseInt(newValue) || 1;
    onChange(newSize);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700" title={tooltip}>
        {label}
      </label>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">深度</div>
          <input
            type="number"
            value={value[0]}
            onChange={(e) => handleSizeChange(0, e.target.value)}
            min="1"
            max="20"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">高度</div>
          <input
            type="number"
            value={value[1]}
            onChange={(e) => handleSizeChange(1, e.target.value)}
            min="1"
            max="20"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">宽度</div>
          <input
            type="number"
            value={value[2]}
            onChange={(e) => handleSizeChange(2, e.target.value)}
            min="1"
            max="20"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center">
        [{value.join(', ')}]
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

function Conv3DNode({ data }) {
  const { conv3dConfigs, updateConv3dConfig } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    filters: 32,
    kernel_size: [3, 3, 3],
    strides: [1, 1, 1],
    padding: 'valid',
    activation: 'linear',
    use_bias: true,
    kernel_initializer: 'glorot_uniform',
    bias_initializer: 'zeros',
    dilation_rate: [1, 1, 1]
  };
  
  const config = conv3dConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateConv3dConfig(configIndex, { ...config, ...updates });
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
          if (!isNaN(value) && value >= 1 && value <= 512) {
            updateConfig({ filters: value });
          }
        }}
        min="1"
        max="512"
        tooltip={FIELD_TOOLTIPS.filters}
      />
      
      <Size3DInput
        label="卷积核大小"
        value={config.kernel_size}
        onChange={(newSize) => updateConfig({ kernel_size: newSize })}
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
      <Size3DInput
        label="步长"
        value={config.strides}
        onChange={(newStrides) => updateConfig({ strides: newStrides })}
        tooltip={FIELD_TOOLTIPS.strides}
      />
      
      <SelectField
        label="填充方式"
        value={config.padding}
        onChange={(e) => updateConfig({ padding: e.target.value })}
        options={[
          { value: 'valid', label: 'Valid (不填充)' },
          { value: 'same', label: 'Same (保持尺寸)' }
        ]}
        tooltip={FIELD_TOOLTIPS.padding}
      />
      
      <Size3DInput
        label="膨胀率"
        value={config.dilation_rate}
        onChange={(newDilation) => updateConfig({ dilation_rate: newDilation })}
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
      title="Conv3D"
      borderColor="border-red-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-red-50 p-2 rounded">
        <div className="font-medium text-red-700 mb-1">三维卷积层</div>
        <div>用于处理三维数据的卷积层，常用于视频分析和3D图像处理</div>
        <div className="mt-1">
          当前配置: {config.filters}个滤波器, 核大小[{config.kernel_size.join(',')}], {config.padding}填充
        </div>
      </div>
    </NodeContainer>
  );
}

export default Conv3DNode; 