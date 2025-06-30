import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  dims: "排列模式的元组。指定维度的新顺序。例如(2,1)表示交换第一和第二维度"
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

// 维度排列组件
const DimsSelector = ({ label, value, onChange, tooltip }) => {
  const [customValue, setCustomValue] = useState(value);
  const [isCustom, setIsCustom] = useState(true);

  const presets = [
    { value: [2, 1], label: '(2,1) - 交换前两维', description: '适用于转置操作' },
    { value: [3, 1, 2], label: '(3,1,2) - 循环移位', description: '将最后一维移到前面' },
    { value: [1, 3, 2], label: '(1,3,2) - 交换后两维', description: '保持第一维，交换后两维' },
    { value: [2, 3, 1], label: '(2,3,1) - 通道在前', description: '将通道维度移到前面' }
  ];

  const handlePresetChange = (preset) => {
    setIsCustom(false);
    onChange(preset);
    setCustomValue(preset);
  };

  const handleCustomChange = (dimStr) => {
    try {
      // 解析输入，支持多种格式
      const cleanStr = dimStr.replace(/[()[\]]/g, '').trim();
      const dims = cleanStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
      
      if (dims.length >= 2) {
        setCustomValue(dims);
        onChange(dims);
      }
    } catch (e) {
      // 忽略解析错误
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700" title={tooltip}>
        {label}
      </label>
      
      <div className="space-y-2">
        {presets.map((preset, index) => (
          <button
            key={index}
            onClick={() => handlePresetChange(preset.value)}
            className={`w-full p-3 text-left rounded border transition-colors ${
              !isCustom && JSON.stringify(value) === JSON.stringify(preset.value)
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="font-medium text-sm">{preset.label}</div>
            <div className="text-xs opacity-75 mt-1">{preset.description}</div>
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
        自定义排列
      </button>
      
      {isCustom && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="输入维度排列，如: 2,1,3 或 (2,1,3)"
            value={Array.isArray(customValue) ? customValue.join(', ') : ''}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-500">
            当前排列: ({Array.isArray(value) ? value.join(', ') : ''})
          </div>
          <div className="text-xs text-amber-600">
            注意：维度索引从1开始，不包括批次维度
          </div>
        </div>
      )}
      
      <div className="bg-gray-50 p-2 rounded text-xs">
        <div className="font-medium text-gray-700 mb-1">排列效果预览</div>
        <div className="text-gray-600">
          如果输入形状为 (batch, d1, d2, d3)，
          <br />
          排列 ({Array.isArray(value) ? value.join(', ') : ''}) 后形状为：
          <br />
          (batch, {Array.isArray(value) ? value.map(i => `d${i}`).join(', ') : ''})
        </div>
      </div>
    </div>
  );
};

function PermuteNode({ data }) {
  const { permuteConfigs, updatePermuteConfig } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    dims: [2, 1]
  };
  
  const config = permuteConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updatePermuteConfig(configIndex, { ...config, ...updates });
  };

  // 验证排列的有效性
  const isValidPermutation = (dims) => {
    if (!Array.isArray(dims) || dims.length < 2) return false;
    const sorted = [...dims].sort();
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) return false;
    }
    return true;
  };

  const isValid = isValidPermutation(config.dims);

  // 基本配置
  const basicConfig = (
    <div className="space-y-4">
      <DimsSelector
        label="维度排列"
        value={config.dims}
        onChange={(newDims) => updateConfig({ dims: newDims })}
        tooltip={FIELD_TOOLTIPS.dims}
      />
      
      {!isValid && (
        <div className="bg-red-50 border border-red-200 p-3 rounded">
          <div className="text-sm text-red-700 font-medium mb-1">⚠️ 无效的排列</div>
          <div className="text-xs text-red-600">
            排列必须包含从1到N的所有整数，且每个数字只能出现一次
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-blue-800 mb-2">Permute层说明</div>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 重新排列输入张量的维度顺序</li>
          <li>• 不改变数据内容，只改变维度排列</li>
          <li>• 常用于调整数据格式以适应不同层的需求</li>
          <li>• 维度索引从1开始（不包括批次维度）</li>
        </ul>
      </div>
    </div>
  );

  // 高级配置
  const advancedConfig = (
    <div className="space-y-4">
      <div className="bg-green-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-green-800 mb-2">常见用例</div>
        <ul className="text-xs text-green-700 space-y-1">
          <li>• <strong>(2,1)</strong>: 转置矩阵，交换行列</li>
          <li>• <strong>(3,1,2)</strong>: 图像数据从HWC到CHW格式</li>
          <li>• <strong>(2,3,1)</strong>: 图像数据从HWC到WCH格式</li>
          <li>• <strong>(1,3,2)</strong>: 保持高度，交换宽度和通道</li>
        </ul>
      </div>
      
      <div className="bg-amber-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-amber-800 mb-2">注意事项</div>
        <ul className="text-xs text-amber-700 space-y-1">
          <li>• 确保后续层能处理新的维度顺序</li>
          <li>• 某些层对输入维度顺序有特定要求</li>
          <li>• 排列操作不会改变总的参数数量</li>
          <li>• 在模型设计时要考虑维度一致性</li>
        </ul>
      </div>
    </div>
  );

  return (
    <NodeContainer
      title="Permute"
      borderColor="border-cyan-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-cyan-50 p-2 rounded">
        <div className="font-medium text-cyan-700 mb-1">维度排列层</div>
        <div>重新排列输入张量的维度顺序，不改变数据内容</div>
        <div className="mt-1">
          当前排列: ({Array.isArray(config.dims) ? config.dims.join(', ') : ''})
          {isValid ? (
            <span className="text-green-600 ml-2">✓ 有效</span>
          ) : (
            <span className="text-red-600 ml-2">✗ 无效</span>
          )}
        </div>
      </div>
    </NodeContainer>
  );
}

export default PermuteNode; 