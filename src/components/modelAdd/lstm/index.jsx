import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  units: "LSTM层中的隐藏单元数量。决定了层的学习能力和模型复杂度，通常在64-512之间",
  activation: "用于输入门、遗忘门和输出门的激活函数。tanh是默认选择，提供良好的梯度流",
  recurrent_activation: "用于循环连接的激活函数。sigmoid是标准选择，确保门控机制正常工作",
  return_sequences: "是否返回完整的输出序列。True返回每个时间步的输出，False只返回最后一个时间步",
  return_state: "是否返回最后的隐藏状态和细胞状态，用于状态传递或多层LSTM",
  go_backwards: "是否反向处理输入序列，可以提高某些任务的性能",
  stateful: "是否在批次间保持状态，用于处理长序列或在线学习",
  dropout: "应用于输入的dropout比例，防止过拟合",
  recurrent_dropout: "应用于循环连接的dropout比例，防止循环权重过拟合",
  use_bias: "是否使用偏置向量，通常建议保持启用",
  bidirectional: "是否使用双向LSTM，可以同时处理正向和反向序列信息"
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

// 滑块组件
const SliderField = ({ label, value, onChange, min, max, step, tooltip }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-gray-700" title={tooltip}>
        {label}
      </label>
      <span className="text-sm text-gray-500">{(value * 100).toFixed(0)}%</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
    />
  </div>
);

function LSTMNode({ data }) {
  const { lstmConfigs, updateLstmConfig } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    units: 128,
    activation: 'tanh',
    recurrent_activation: 'sigmoid',
    use_bias: true,
    return_sequences: false,
    return_state: false,
    go_backwards: false,
    stateful: false,
    dropout: 0.0,
    recurrent_dropout: 0.0,
    bidirectional: false
  };
  
  const config = lstmConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateLstmConfig(configIndex, { ...config, ...updates });
  };

  // 基本配置
  const basicConfig = (
    <div className="space-y-4">
      <InputField
        label="隐藏单元数"
        type="number"
        value={config.units}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value) && value >= 1 && value <= 2048) {
            updateConfig({ units: value });
          }
        }}
        min="1"
        max="2048"
        tooltip={FIELD_TOOLTIPS.units}
      />
      
      <SelectField
        label="激活函数"
        value={config.activation}
        onChange={(e) => updateConfig({ activation: e.target.value })}
        options={[
          { value: 'tanh', label: 'Tanh (推荐)' },
          { value: 'relu', label: 'ReLU' },
          { value: 'sigmoid', label: 'Sigmoid' },
          { value: 'linear', label: 'Linear' }
        ]}
        tooltip={FIELD_TOOLTIPS.activation}
      />
      
      <ToggleSwitch
        label="返回序列"
        checked={config.return_sequences}
        onChange={(e) => updateConfig({ return_sequences: e.target.checked })}
        tooltip={FIELD_TOOLTIPS.return_sequences}
      />
      
      {config.return_sequences && (
        <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
          输出形状: (batch, timesteps, units) - 需要Flatten后连接Dense层
        </div>
      )}
      {!config.return_sequences && (
        <div className="bg-green-50 p-2 rounded text-xs text-green-700">
          输出形状: (batch, units) - 可直接连接Dense层
        </div>
      )}
    </div>
  );

  // 高级配置
  const advancedConfig = (
    <div className="space-y-4">
      <SelectField
        label="循环激活函数"
        value={config.recurrent_activation}
        onChange={(e) => updateConfig({ recurrent_activation: e.target.value })}
        options={[
          { value: 'sigmoid', label: 'Sigmoid (推荐)' },
          { value: 'hard_sigmoid', label: 'Hard Sigmoid' },
          { value: 'tanh', label: 'Tanh' },
          { value: 'relu', label: 'ReLU' }
        ]}
        tooltip={FIELD_TOOLTIPS.recurrent_activation}
      />
      
      <div className="grid grid-cols-2 gap-3">
        <ToggleSwitch
          label="返回状态"
          checked={config.return_state}
          onChange={(e) => updateConfig({ return_state: e.target.checked })}
          tooltip={FIELD_TOOLTIPS.return_state}
        />
        <ToggleSwitch
          label="反向处理"
          checked={config.go_backwards}
          onChange={(e) => updateConfig({ go_backwards: e.target.checked })}
          tooltip={FIELD_TOOLTIPS.go_backwards}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <ToggleSwitch
          label="有状态"
          checked={config.stateful}
          onChange={(e) => updateConfig({ stateful: e.target.checked })}
          tooltip={FIELD_TOOLTIPS.stateful}
        />
        <ToggleSwitch
          label="使用偏置"
          checked={config.use_bias}
          onChange={(e) => updateConfig({ use_bias: e.target.checked })}
          tooltip={FIELD_TOOLTIPS.use_bias}
        />
      </div>
      
      <ToggleSwitch
        label="双向LSTM"
        checked={config.bidirectional}
        onChange={(e) => updateConfig({ bidirectional: e.target.checked })}
        tooltip={FIELD_TOOLTIPS.bidirectional}
      />
      
      <SliderField
        label="输入Dropout"
        value={config.dropout}
        onChange={(e) => updateConfig({ dropout: parseFloat(e.target.value) })}
        min="0"
        max="0.9"
        step="0.05"
        tooltip={FIELD_TOOLTIPS.dropout}
      />
      
      <SliderField
        label="循环Dropout"
        value={config.recurrent_dropout}
        onChange={(e) => updateConfig({ recurrent_dropout: parseFloat(e.target.value) })}
        min="0"
        max="0.9"
        step="0.05"
        tooltip={FIELD_TOOLTIPS.recurrent_dropout}
      />
    </div>
  );

  return (
    <NodeContainer
      title="LSTM"
      borderColor="border-blue-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
        <div className="font-medium text-blue-700 mb-1">长短期记忆网络</div>
        <div>专门用于处理序列数据的循环神经网络，能够学习长期依赖关系</div>
        <div className="mt-1">
          当前配置: {config.units}个单元, {config.activation}激活
          {config.bidirectional && ', 双向'}
          {config.return_sequences && ', 返回序列'}
        </div>
      </div>
    </NodeContainer>
  );
}

export default LSTMNode; 