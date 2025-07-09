import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  n: "重复次数。输入将沿新的轴重复n次"
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

// 重复次数选择组件
const RepeatSelector = ({ label, value, onChange, tooltip }) => {
  const presetValues = [1, 5, 10, 20, 50, 100];
  const [isCustom, setIsCustom] = useState(!presetValues.includes(value));
  
  const presets = presetValues.map(n => ({
    value: n,
    label: `${n}次`,
    description: `输出形状: (batch, ${n}, features)`
  }));

  const handlePresetChange = (preset) => {
    setIsCustom(false);
    onChange(preset);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700" title={tooltip}>
        {label}
      </label>
      
      <div className="grid grid-cols-3 gap-2">
        {presets.map((preset, index) => (
          <button
            key={index}
            onClick={() => handlePresetChange(preset.value)}
            className={`p-2 text-sm rounded border transition-colors text-center ${
              !isCustom && value === preset.value
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="font-medium">{preset.label}</div>
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
        自定义次数
      </button>
      
      {isCustom && (
        <div className="space-y-2">
          <input
            type="number"
            placeholder="输入重复次数"
            value={value}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 1 && val <= 1000) {
                onChange(val);
              }
            }}
            min="1"
            max="1000"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-500">
            当前重复次数: {value}
          </div>
        </div>
      )}
      
      <div className="bg-gray-50 p-2 rounded text-xs">
        <div className="font-medium text-gray-700 mb-1">形状变化预览</div>
        <div className="text-gray-600">
          输入形状: (batch, features)
          <br />
          输出形状: (batch, {value}, features)
          <br />
          <span className="text-blue-600">
            增加了时间步维度，常用于序列生成
          </span>
        </div>
      </div>
    </div>
  );
};

function RepeatVectorNode({ data }) {
  const { repeatVectorConfigs, updateRepeatVectorConfig } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    n: 10
  };
  
  const config = repeatVectorConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateRepeatVectorConfig(configIndex, { ...config, ...updates });
  };

  // 基本配置
  const basicConfig = (
    <div className="space-y-4">
      <RepeatSelector
        label="重复次数"
        value={config.n}
        onChange={(newN) => updateConfig({ n: newN })}
        tooltip={FIELD_TOOLTIPS.n}
      />
      
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-blue-800 mb-2">RepeatVector层说明</div>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 将输入向量重复n次，创建序列</li>
          <li>• 输入形状: (batch, features)</li>
          <li>• 输出形状: (batch, n, features)</li>
          <li>• 常用于编码器-解码器架构</li>
        </ul>
      </div>
    </div>
  );

  // 高级配置
  const advancedConfig = (
    <div className="space-y-4">
      <div className="bg-green-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-green-800 mb-2">典型应用场景</div>
        <ul className="text-xs text-green-700 space-y-1">
          <li>• <strong>序列到序列模型</strong>: 将编码器输出重复作为解码器输入</li>
          <li>• <strong>文本生成</strong>: 从单一向量生成多个时间步</li>
          <li>• <strong>图像描述</strong>: 将图像特征重复用于文字生成</li>
          <li>• <strong>时间序列预测</strong>: 创建多步预测的初始状态</li>
        </ul>
      </div>
      
      <div className="bg-amber-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-amber-800 mb-2">参数选择建议</div>
        <ul className="text-xs text-amber-700 space-y-1">
          <li>• <strong>短序列 (5-20)</strong>: 适用于简短文本或小规模时间序列</li>
          <li>• <strong>中等序列 (20-100)</strong>: 适用于段落级文本或中期预测</li>
          <li>• <strong>长序列 (100+)</strong>: 适用于长文档或长期时间序列</li>
          <li>• 注意内存使用量会随重复次数线性增长</li>
        </ul>
      </div>
      
      <div className="bg-purple-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-purple-800 mb-2">与其他层的配合</div>
        <ul className="text-xs text-purple-700 space-y-1">
          <li>• 通常放在Dense层之后，LSTM/GRU层之前</li>
          <li>• 可以与TimeDistributed层配合使用</li>
          <li>• 在注意力机制中作为查询向量的复制</li>
          <li>• 与Masking层配合处理变长序列</li>
        </ul>
      </div>
    </div>
  );

  return (
    <NodeContainer
      title="RepeatVector"
      borderColor="border-emerald-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-emerald-50 p-2 rounded">
        <div className="font-medium text-emerald-700 mb-1">重复向量层</div>
        <div>将输入向量重复n次，常用于序列生成和编码器-解码器架构</div>
        <div className="mt-1">
          当前配置: 重复{config.n}次
          <br />
          <span className="text-emerald-600">
            (batch, features) → (batch, {config.n}, features)
          </span>
        </div>
      </div>
    </NodeContainer>
  );
}

export default RepeatVectorNode; 