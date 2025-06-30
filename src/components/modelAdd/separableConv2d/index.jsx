import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  filters: "输出空间的维度（即卷积中输出滤波器的数量）。决定了特征图的数量",
  kernel_size: "卷积核的尺寸。可以是单个整数或2个整数的元组 [高度, 宽度]",
  strides: "卷积的步长。指定卷积核在两个维度上移动的步长",
  padding: "填充方式。'valid'表示不填充，'same'表示填充以保持输出尺寸",
  activation: "要使用的激活函数。如果为None，则不应用激活函数",
  use_bias: "是否使用偏置向量。通常建议保持启用",
  depthwise_initializer: "深度卷积核权重矩阵的初始化器",
  pointwise_initializer: "逐点卷积核权重矩阵的初始化器",
  bias_initializer: "偏置向量的初始化器",
  depth_multiplier: "每个输入通道的深度卷积输出通道数。总输出通道数等于 filters_in * depth_multiplier",
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

// 二维尺寸输入组件
const Size2DInput = ({ label, value, onChange, tooltip }) => {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState(value);

  const presets = [
    { value: [1, 1], label: '1×1' },
    { value: [3, 3], label: '3×3' },
    { value: [5, 5], label: '5×5' },
    { value: [7, 7], label: '7×7' }
  ];

  const handlePresetChange = (preset) => {
    setIsCustom(false);
    onChange(preset);
    setCustomValue(preset);
  };

  const handleCustomChange = (index, newValue) => {
    const newSize = [...customValue];
    newSize[index] = parseInt(newValue) || 1;
    setCustomValue(newSize);
    onChange(newSize);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700" title={tooltip}>
        {label}
      </label>
      
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePresetChange(preset.value)}
            className={`px-3 py-2 text-sm rounded border transition-colors ${
              !isCustom && JSON.stringify(value) === JSON.stringify(preset.value)
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      
      <button
        onClick={() => setIsCustom(!isCustom)}
        className={`w-full px-3 py-2 text-sm rounded border transition-colors ${
          isCustom
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        自定义尺寸
      </button>
      
      {isCustom && (
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">高度</div>
            <input
              type="number"
              value={customValue[0]}
              onChange={(e) => handleCustomChange(0, e.target.value)}
              min="1"
              max="20"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">宽度</div>
            <input
              type="number"
              value={customValue[1]}
              onChange={(e) => handleCustomChange(1, e.target.value)}
              min="1"
              max="20"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
      
      <div className="text-xs text-gray-500 text-center">
        当前: [{value.join(' × ')}]
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

function SeparableConv2DNode({ data }) {
  const { separableConv2dConfigs, updateSeparableConv2dConfig } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    filters: 32,
    kernel_size: [3, 3],
    strides: [1, 1],
    padding: 'valid',
    activation: 'linear',
    use_bias: true,
    depthwise_initializer: 'glorot_uniform',
    pointwise_initializer: 'glorot_uniform',
    bias_initializer: 'zeros',
    depth_multiplier: 1,
    dilation_rate: [1, 1]
  };
  
  const config = separableConv2dConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateSeparableConv2dConfig(configIndex, { ...config, ...updates });
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
          if (!isNaN(value) && value >= 1 && value <= 1024) {
            updateConfig({ filters: value });
          }
        }}
        min="1"
        max="1024"
        tooltip={FIELD_TOOLTIPS.filters}
      />
      
      <Size2DInput
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
      <Size2DInput
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
      
      <InputField
        label="深度倍数"
        type="number"
        value={config.depth_multiplier}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value) && value >= 1 && value <= 8) {
            updateConfig({ depth_multiplier: value });
          }
        }}
        min="1"
        max="8"
        tooltip={FIELD_TOOLTIPS.depth_multiplier}
      />
      
      <Size2DInput
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
        label="深度卷积初始化器"
        value={config.depthwise_initializer}
        onChange={(e) => updateConfig({ depthwise_initializer: e.target.value })}
        options={[
          { value: 'glorot_uniform', label: 'Glorot Uniform' },
          { value: 'glorot_normal', label: 'Glorot Normal' },
          { value: 'he_uniform', label: 'He Uniform' },
          { value: 'he_normal', label: 'He Normal' }
        ]}
        tooltip={FIELD_TOOLTIPS.depthwise_initializer}
      />
      
      <SelectField
        label="逐点卷积初始化器"
        value={config.pointwise_initializer}
        onChange={(e) => updateConfig({ pointwise_initializer: e.target.value })}
        options={[
          { value: 'glorot_uniform', label: 'Glorot Uniform' },
          { value: 'glorot_normal', label: 'Glorot Normal' },
          { value: 'he_uniform', label: 'He Uniform' },
          { value: 'he_normal', label: 'He Normal' }
        ]}
        tooltip={FIELD_TOOLTIPS.pointwise_initializer}
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
      title="SeparableConv2D"
      borderColor="border-purple-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-purple-50 p-2 rounded">
        <div className="font-medium text-purple-700 mb-1">深度可分离卷积层</div>
        <div>将标准卷积分解为深度卷积和逐点卷积，大幅减少参数量和计算量</div>
        <div className="mt-1">
          当前配置: {config.filters}个滤波器, 核大小[{config.kernel_size.join('×')}], 深度倍数{config.depth_multiplier}
        </div>
      </div>
    </NodeContainer>
  );
}

export default SeparableConv2DNode; 