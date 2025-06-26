import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  axis: "指定要归一化的轴。-1表示最后一个轴（特征轴），通常用于全连接层后的归一化",
  momentum: "用于计算运行均值和方差的动量参数。较高的值使统计信息更新更慢，提供更稳定的归一化",
  epsilon: "添加到方差的小常数，防止除零错误。较小的值提供更精确的归一化，但可能导致数值不稳定",
  center: "是否学习偏移参数beta。启用时会在归一化后添加可学习的偏移量",
  scale: "是否学习缩放参数gamma。启用时会在归一化后应用可学习的缩放因子",
  beta_initializer: "偏移参数beta的初始化方法。零初始化是标准做法",
  gamma_initializer: "缩放参数gamma的初始化方法。单位初始化保持初始输出分布不变"
};

// 输入字段组件
const InputField = ({ label, value, onChange, type = "text", min, max, step, tooltip, className = "" }) => (
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
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    />
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

function BatchNormNode({ data }) {
  const { batchNormConfigs, updateBatchNormConfig } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    axis: -1,
    momentum: 0.99,
    epsilon: 0.001,
    center: true,
    scale: true,
    beta_initializer: "zeros",
    gamma_initializer: "ones"
  };
  
  const config = batchNormConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateBatchNormConfig(configIndex, { ...config, ...updates });
  };

  // 基本配置
  const basicConfig = (
    <div className="space-y-4">
      <InputField
        label="动量 (Momentum)"
        type="number"
        value={config.momentum}
        onChange={(e) => {
          const value = parseFloat(e.target.value);
          if (!isNaN(value) && value >= 0 && value <= 1) {
            updateConfig({ momentum: value });
          }
        }}
        min="0"
        max="1"
        step="0.01"
        tooltip={FIELD_TOOLTIPS.momentum}
      />
      
      <div className="grid grid-cols-2 gap-3">
        <ToggleSwitch
          label="Center"
          checked={config.center}
          onChange={(e) => updateConfig({ center: e.target.checked })}
          tooltip={FIELD_TOOLTIPS.center}
        />
        <ToggleSwitch
          label="Scale"
          checked={config.scale}
          onChange={(e) => updateConfig({ scale: e.target.checked })}
          tooltip={FIELD_TOOLTIPS.scale}
        />
      </div>
    </div>
  );

  // 高级配置
  const advancedConfig = (
    <div className="space-y-4">
      <InputField
        label="归一化轴 (Axis)"
        type="number"
        value={config.axis}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value) && value >= -10 && value <= 10) {
            updateConfig({ axis: value });
          }
        }}
        min="-10"
        max="10"
        tooltip={FIELD_TOOLTIPS.axis}
      />
      
      <InputField
        label="Epsilon"
        type="number"
        value={config.epsilon}
        onChange={(e) => {
          const value = parseFloat(e.target.value);
          if (!isNaN(value) && value >= 1e-8 && value <= 0.01) {
            updateConfig({ epsilon: value });
          }
        }}
        min="0.00000001"
        max="0.01"
        step="0.000001"
        tooltip={FIELD_TOOLTIPS.epsilon}
      />
      
      <SelectField
        label="Beta初始化器"
        value={config.beta_initializer}
        onChange={(e) => updateConfig({ beta_initializer: e.target.value })}
        options={[
          { value: "zeros", label: "零初始化" },
          { value: "ones", label: "单位初始化" },
          { value: "random_normal", label: "随机正态" },
          { value: "random_uniform", label: "随机均匀" }
        ]}
        tooltip={FIELD_TOOLTIPS.beta_initializer}
      />
      
      <SelectField
        label="Gamma初始化器"
        value={config.gamma_initializer}
        onChange={(e) => updateConfig({ gamma_initializer: e.target.value })}
        options={[
          { value: "ones", label: "单位初始化" },
          { value: "zeros", label: "零初始化" },
          { value: "random_normal", label: "随机正态" },
          { value: "random_uniform", label: "随机均匀" }
        ]}
        tooltip={FIELD_TOOLTIPS.gamma_initializer}
      />
    </div>
  );

  return (
    <NodeContainer
      title="Batch Normalization"
      borderColor="border-purple-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-purple-50 p-2 rounded">
        <div className="font-medium text-purple-700 mb-1">批量归一化层</div>
        <div>标准化每个批次的激活值，加速训练收敛并提高模型稳定性</div>
      </div>
    </NodeContainer>
  );
}

export default BatchNormNode; 