import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  mask_value: "要掩码的值。如果输入中的时间步等于mask_value，则该时间步将在所有下游层中被掩码（跳过）"
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

function MaskingNode({ data }) {
  const { maskingConfigs, updateMaskingConfig } = useStore();
  const configIndex = data.index || 0;
  
  const defaultConfig = {
    mask_value: 0.0
  };
  
  const config = maskingConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateMaskingConfig(configIndex, { ...config, ...updates });
  };

  const basicConfig = (
    <div className="space-y-4">
      <InputField
        label="掩码值"
        type="number"
        value={config.mask_value}
        onChange={(e) => {
          const value = parseFloat(e.target.value);
          if (!isNaN(value)) {
            updateConfig({ mask_value: value });
          }
        }}
        step="0.1"
        tooltip={FIELD_TOOLTIPS.mask_value}
      />
      
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-blue-800 mb-2">Masking层说明</div>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 跳过序列中等于mask_value的时间步</li>
          <li>• 常用于处理变长序列</li>
          <li>• 通常放在Embedding层之后</li>
          <li>• 支持循环层和注意力层的掩码传播</li>
        </ul>
      </div>
    </div>
  );

  const advancedConfig = (
    <div className="space-y-4">
      <div className="bg-green-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-green-800 mb-2">典型使用场景</div>
        <ul className="text-xs text-green-700 space-y-1">
          <li>• <strong>文本处理</strong>: 跳过填充的token</li>
          <li>• <strong>时间序列</strong>: 忽略缺失的时间点</li>
          <li>• <strong>变长序列</strong>: 处理批次中不同长度的序列</li>
          <li>• <strong>注意力机制</strong>: 防止注意力关注填充位置</li>
        </ul>
      </div>
      
      <div className="bg-amber-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-amber-800 mb-2">掩码值选择</div>
        <ul className="text-xs text-amber-700 space-y-1">
          <li>• <strong>0.0</strong>: 最常用，适合大多数情况</li>
          <li>• <strong>-1</strong>: 某些tokenizer使用的填充值</li>
          <li>• <strong>特殊值</strong>: 根据数据预处理方式选择</li>
          <li>• 确保掩码值不会与有效数据冲突</li>
        </ul>
      </div>
      
      <div className="bg-purple-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-purple-800 mb-2">与其他层的配合</div>
        <ul className="text-xs text-purple-700 space-y-1">
          <li>• <strong>Embedding</strong>: 通常在Embedding层之后使用</li>
          <li>• <strong>LSTM/GRU</strong>: 自动处理掩码，跳过被掩码的时间步</li>
          <li>• <strong>注意力层</strong>: 将掩码传播到注意力计算</li>
          <li>• <strong>TimeDistributed</strong>: 支持掩码的时间分布层</li>
        </ul>
      </div>
    </div>
  );

  return (
    <NodeContainer
      title="Masking"
      borderColor="border-gray-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <div className="font-medium text-gray-700 mb-1">掩码层</div>
        <div>跳过序列中等于指定值的时间步，用于处理变长序列</div>
        <div className="mt-1">
          当前配置: 掩码值 = {config.mask_value}
        </div>
      </div>
    </NodeContainer>
  );
}

export default MaskingNode; 