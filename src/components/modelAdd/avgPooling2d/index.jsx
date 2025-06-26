import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  pool_size: "池化窗口的大小。定义了在每个池化操作中考虑的输入区域大小，较大的池化窗口会更大程度地减少空间维度",
  strides: "池化窗口的步长。如果为null，则默认等于pool_size。较小的步长会产生更多重叠的池化窗口",
  padding: "填充方式。'valid'表示不填充，'same'表示填充以保持输出大小",
  data_format: "数据格式。'channels_last'表示(batch, height, width, channels)，'channels_first'表示(batch, channels, height, width)"
};

// 尺寸选择器组件
const SizeSelector = ({ label, value, onChange, tooltip }) => {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const presetSizes = [
    { value: [2, 2], label: '2×2' },
    { value: [3, 3], label: '3×3' },
    { value: [4, 4], label: '4×4' },
    { value: [5, 5], label: '5×5' }
  ];

  const handlePresetChange = (size) => {
    setIsCustom(false);
    onChange(size);
  };

  const handleCustomToggle = () => {
    setIsCustom(!isCustom);
    if (!isCustom) {
      setCustomValue(`${value[0]}, ${value[1]}`);
    }
  };

  const handleCustomChange = (e) => {
    const val = e.target.value;
    setCustomValue(val);
    
    // 解析自定义输入
    const match = val.match(/(\d+)\s*,\s*(\d+)/);
    if (match) {
      const width = parseInt(match[1]);
      const height = parseInt(match[2]);
      if (width > 0 && height > 0 && width <= 10 && height <= 10) {
        onChange([width, height]);
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700" title={tooltip}>
        {label}
      </label>
      
      {!isCustom ? (
        <div className="grid grid-cols-2 gap-2">
          {presetSizes.map((size, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handlePresetChange(size.value)}
              className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                JSON.stringify(value) === JSON.stringify(size.value)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={customValue}
          onChange={handleCustomChange}
          placeholder="例如: 3, 3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      )}
      
      <button
        type="button"
        onClick={handleCustomToggle}
        className="text-xs text-blue-600 hover:text-blue-800"
      >
        {isCustom ? '使用预设' : '自定义尺寸'}
      </button>
    </div>
  );
};

// 输入字段组件
const InputField = ({ label, value, onChange, type = "text", tooltip, placeholder }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700" title={tooltip}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
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

function AvgPooling2DNode({ data }) {
  const { avgPooling2dConfigs, updateAvgPooling2dConfig } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    pool_size: [2, 2],
    strides: null, // null表示使用与pool_size相同的值
    padding: 'valid',
    data_format: null
  };
  
  const config = avgPooling2dConfigs[configIndex] || defaultConfig;
  const [useCustomStrides, setUseCustomStrides] = useState(config.strides !== null);

  const updateConfig = (updates) => {
    updateAvgPooling2dConfig(configIndex, { ...config, ...updates });
  };

  // 基本配置
  const basicConfig = (
    <div className="space-y-4">
      <SizeSelector
        label="池化窗口大小"
        value={config.pool_size}
        onChange={(size) => updateConfig({ pool_size: size })}
        tooltip={FIELD_TOOLTIPS.pool_size}
      />
      
      <SelectField
        label="填充方式"
        value={config.padding}
        onChange={(e) => updateConfig({ padding: e.target.value })}
        options={[
          { value: 'valid', label: 'Valid (不填充)' },
          { value: 'same', label: 'Same (填充保持尺寸)' }
        ]}
        tooltip={FIELD_TOOLTIPS.padding}
      />
    </div>
  );

  // 高级配置
  const advancedConfig = (
    <div className="space-y-4">
      <div className="space-y-2">
        <ToggleSwitch
          label="自定义步长"
          checked={useCustomStrides}
          onChange={(e) => {
            const checked = e.target.checked;
            setUseCustomStrides(checked);
            updateConfig({ strides: checked ? config.pool_size : null });
          }}
          tooltip="是否使用与池化大小不同的步长"
        />
        
        {useCustomStrides && (
          <SizeSelector
            label="步长"
            value={config.strides || config.pool_size}
            onChange={(size) => updateConfig({ strides: size })}
            tooltip={FIELD_TOOLTIPS.strides}
          />
        )}
      </div>
      
      <SelectField
        label="数据格式"
        value={config.data_format || 'channels_last'}
        onChange={(e) => updateConfig({ data_format: e.target.value === 'channels_last' ? null : e.target.value })}
        options={[
          { value: 'channels_last', label: 'Channels Last (默认)' },
          { value: 'channels_first', label: 'Channels First' }
        ]}
        tooltip={FIELD_TOOLTIPS.data_format}
      />
    </div>
  );

  return (
    <NodeContainer
      title="Average Pooling 2D"
      borderColor="border-cyan-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-cyan-50 p-2 rounded">
        <div className="font-medium text-cyan-700 mb-1">平均池化层</div>
        <div>计算输入窗口的平均值，用于降采样和特征提取</div>
        <div className="mt-1">
          当前配置: {config.pool_size[0]}×{config.pool_size[1]} 窗口, {config.padding} 填充
        </div>
      </div>
    </NodeContainer>
  );
}

export default AvgPooling2DNode; 