import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  axis: "应用归一化的轴。通常对最后一个轴进行归一化（特征维度）",
  epsilon: "添加到方差的小常数，避免除零错误。通常使用1e-6到1e-3之间的值",
  center: "是否添加学习的偏移参数beta。如果为True，会学习一个偏移量",
  scale: "是否添加学习的缩放参数gamma。如果为True，会学习一个缩放因子",
  beta_initializer: "beta权重的初始化器。beta是偏移参数",
  gamma_initializer: "gamma权重的初始化器。gamma是缩放参数",
  beta_regularizer: "应用于beta权重的正则化器",
  gamma_regularizer: "应用于gamma权重的正则化器",
  beta_constraint: "应用于beta权重的约束",
  gamma_constraint: "应用于gamma权重的约束"
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

// 轴选择组件
const AxisSelector = ({ label, value, onChange, tooltip }) => {
  const [isCustom, setIsCustom] = useState(Array.isArray(value));
  const [customAxes, setCustomAxes] = useState(Array.isArray(value) ? value : [-1]);

  const presets = [
    { value: -1, label: '最后一轴 (-1)' },
    { value: 1, label: '特征轴 (1)' },
    { value: [1, 2], label: '空间轴 ([1,2])' },
    { value: [-2, -1], label: '最后两轴 ([-2,-1])' }
  ];

  const handlePresetChange = (preset) => {
    setIsCustom(false);
    onChange(preset);
  };

  const handleCustomChange = (axisStr) => {
    try {
      const axes = axisStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      setCustomAxes(axes);
      onChange(axes.length === 1 ? axes[0] : axes);
    } catch (e) {
      // 忽略解析错误
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700" title={tooltip}>
        {label}
      </label>
      
      <div className="grid grid-cols-1 gap-2">
        {presets.map((preset, index) => (
          <button
            key={index}
            onClick={() => handlePresetChange(preset.value)}
            className={`px-3 py-2 text-sm rounded border transition-colors text-left ${
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
        自定义轴
      </button>
      
      {isCustom && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="输入轴索引，用逗号分隔 (如: -1 或 1,2)"
            value={Array.isArray(customAxes) ? customAxes.join(', ') : customAxes.toString()}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-500">
            当前: {Array.isArray(value) ? `[${value.join(', ')}]` : value}
          </div>
        </div>
      )}
    </div>
  );
};

function LayerNormalizationNode({ data }) {
  const { layerNormalizationConfigs, updateLayerNormalizationConfig } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    axis: -1,
    epsilon: 1e-6,
    center: true,
    scale: true,
    beta_initializer: 'zeros',
    gamma_initializer: 'ones',
    beta_regularizer: null,
    gamma_regularizer: null,
    beta_constraint: null,
    gamma_constraint: null
  };
  
  const config = layerNormalizationConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateLayerNormalizationConfig(configIndex, { ...config, ...updates });
  };

  // 基本配置
  const basicConfig = (
    <div className="space-y-4">
      <AxisSelector
        label="归一化轴"
        value={config.axis}
        onChange={(newAxis) => updateConfig({ axis: newAxis })}
        tooltip={FIELD_TOOLTIPS.axis}
      />
      
      <InputField
        label="Epsilon"
        type="number"
        value={config.epsilon}
        onChange={(e) => {
          const value = parseFloat(e.target.value);
          if (!isNaN(value) && value > 0 && value < 1) {
            updateConfig({ epsilon: value });
          }
        }}
        min="1e-8"
        max="1e-3"
        step="1e-6"
        tooltip={FIELD_TOOLTIPS.epsilon}
      />
      
      <ToggleSwitch
        label="Center (使用Beta)"
        checked={config.center}
        onChange={(e) => updateConfig({ center: e.target.checked })}
        tooltip={FIELD_TOOLTIPS.center}
      />
      
      <ToggleSwitch
        label="Scale (使用Gamma)"
        checked={config.scale}
        onChange={(e) => updateConfig({ scale: e.target.checked })}
        tooltip={FIELD_TOOLTIPS.scale}
      />
    </div>
  );

  // 高级配置
  const advancedConfig = (
    <div className="space-y-4">
      <SelectField
        label="Beta初始化器"
        value={config.beta_initializer}
        onChange={(e) => updateConfig({ beta_initializer: e.target.value })}
        options={[
          { value: 'zeros', label: 'Zeros' },
          { value: 'ones', label: 'Ones' },
          { value: 'random_uniform', label: 'Random Uniform' },
          { value: 'random_normal', label: 'Random Normal' }
        ]}
        tooltip={FIELD_TOOLTIPS.beta_initializer}
      />
      
      <SelectField
        label="Gamma初始化器"
        value={config.gamma_initializer}
        onChange={(e) => updateConfig({ gamma_initializer: e.target.value })}
        options={[
          { value: 'ones', label: 'Ones' },
          { value: 'zeros', label: 'Zeros' },
          { value: 'random_uniform', label: 'Random Uniform' },
          { value: 'random_normal', label: 'Random Normal' }
        ]}
        tooltip={FIELD_TOOLTIPS.gamma_initializer}
      />
      
      <SelectField
        label="Beta正则化器"
        value={config.beta_regularizer || 'none'}
        onChange={(e) => updateConfig({ beta_regularizer: e.target.value === 'none' ? null : e.target.value })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'l1', label: 'L1' },
          { value: 'l2', label: 'L2' },
          { value: 'l1_l2', label: 'L1+L2' }
        ]}
        tooltip={FIELD_TOOLTIPS.beta_regularizer}
      />
      
      <SelectField
        label="Gamma正则化器"
        value={config.gamma_regularizer || 'none'}
        onChange={(e) => updateConfig({ gamma_regularizer: e.target.value === 'none' ? null : e.target.value })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'l1', label: 'L1' },
          { value: 'l2', label: 'L2' },
          { value: 'l1_l2', label: 'L1+L2' }
        ]}
        tooltip={FIELD_TOOLTIPS.gamma_regularizer}
      />
      
      <SelectField
        label="Beta约束"
        value={config.beta_constraint || 'none'}
        onChange={(e) => updateConfig({ beta_constraint: e.target.value === 'none' ? null : e.target.value })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'max_norm', label: 'Max Norm' },
          { value: 'min_max_norm', label: 'Min Max Norm' },
          { value: 'unit_norm', label: 'Unit Norm' }
        ]}
        tooltip={FIELD_TOOLTIPS.beta_constraint}
      />
      
      <SelectField
        label="Gamma约束"
        value={config.gamma_constraint || 'none'}
        onChange={(e) => updateConfig({ gamma_constraint: e.target.value === 'none' ? null : e.target.value })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'max_norm', label: 'Max Norm' },
          { value: 'min_max_norm', label: 'Min Max Norm' },
          { value: 'unit_norm', label: 'Unit Norm' }
        ]}
        tooltip={FIELD_TOOLTIPS.gamma_constraint}
      />
    </div>
  );

  return (
    <NodeContainer
      title="LayerNormalization"
      borderColor="border-teal-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-teal-50 p-2 rounded">
        <div className="font-medium text-teal-700 mb-1">层归一化</div>
        <div>对每个样本的特征维度进行归一化，常用于Transformer和RNN</div>
        <div className="mt-1">
          当前配置: 轴{Array.isArray(config.axis) ? `[${config.axis.join(',')}]` : config.axis}, 
          ε={config.epsilon}, {config.center ? '有' : '无'}偏移, {config.scale ? '有' : '无'}缩放
        </div>
      </div>
    </NodeContainer>
  );
}

export default LayerNormalizationNode; 