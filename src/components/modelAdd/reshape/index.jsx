import React, { useState, useEffect } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  target_shape: "目标输出形状。使用-1表示自动推断该维度的大小，确保总元素数量保持不变",
  common_shapes: "常见的重塑模式，用于快速设置目标形状",
  input_shape: "输入张量的形状信息，用于验证重塑操作的有效性"
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

// 形状预设组件
const ShapePresets = ({ onSelect, tooltip }) => {
  const presets = [
    { name: '展平 (Flatten)', shape: [-1], description: '转换为一维向量' },
    { name: '图像 28×28', shape: [28, 28, 1], description: 'MNIST图像格式' },
    { name: '图像 32×32', shape: [32, 32, 3], description: 'CIFAR图像格式' },
    { name: '时间序列', shape: [-1, 10, 1], description: '序列数据格式' },
    { name: '矩阵', shape: [-1, 64], description: '二维矩阵格式' }
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700" title={tooltip}>
        常用形状预设
      </label>
      <div className="grid grid-cols-1 gap-2">
        {presets.map((preset, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(preset.shape)}
            className="p-2 text-left border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <div className="font-medium text-sm text-gray-900">{preset.name}</div>
            <div className="text-xs text-gray-500">{preset.description}</div>
            <div className="text-xs text-blue-600 font-mono">
              [{preset.shape.join(', ')}]
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// 形状输入组件
const ShapeInput = ({ value, onChange, tooltip }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (Array.isArray(value)) {
      setInputValue(value.join(', '));
    }
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    
    // 解析输入的形状
    try {
      const shape = val.split(',').map(s => {
        const trimmed = s.trim();
        if (trimmed === '-1') return -1;
        const num = parseInt(trimmed);
        return isNaN(num) ? 0 : num;
      }).filter(n => n !== 0);
      
      if (shape.length > 0) {
        onChange(shape);
      }
    } catch (error) {
      // 忽略解析错误
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700" title={tooltip}>
        目标形状
      </label>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="例如: -1, 28, 28, 1"
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <div className="text-xs text-gray-500">
        使用逗号分隔各维度，-1表示自动推断
      </div>
    </div>
  );
};

function ReshapeNode({ data }) {
  const { reshapeConfigs, updateReshapeConfig, csvData } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    target_shape: [-1] // 默认展平
  };
  
  const config = reshapeConfigs[configIndex] || defaultConfig;
  const [estimatedInput, setEstimatedInput] = useState('未知');

  const updateConfig = (updates) => {
    updateReshapeConfig(configIndex, { ...config, ...updates });
  };

  // 估算输入形状
  useEffect(() => {
    if (csvData && csvData.length > 0 && csvData[0]) {
      const numericColumns = Object.keys(csvData[0]).filter(key => 
        typeof csvData[0][key] === 'number' || !isNaN(parseFloat(csvData[0][key]))
      );
      setEstimatedInput(`(batch_size, ${numericColumns.length})`);
    } else {
      setEstimatedInput('(batch_size, features)');
    }
  }, [csvData]);

  // 计算输出形状描述
  const getOutputDescription = () => {
    if (!config.target_shape || config.target_shape.length === 0) {
      return '未设置';
    }
    
    const shape = config.target_shape.map(dim => dim === -1 ? 'auto' : dim).join(' × ');
    return `(${shape})`;
  };

  // 基本配置
  const basicConfig = (
    <div className="space-y-4">
      <ShapeInput
        value={config.target_shape}
        onChange={(shape) => updateConfig({ target_shape: shape })}
        tooltip={FIELD_TOOLTIPS.target_shape}
      />
      
      <div className="bg-blue-50 p-3 rounded-md">
        <div className="text-sm font-medium text-blue-800 mb-1">形状变换</div>
        <div className="text-xs text-blue-700">
          <div>输入: {estimatedInput}</div>
          <div>输出: {getOutputDescription()}</div>
        </div>
      </div>
    </div>
  );

  // 高级配置
  const advancedConfig = (
    <div className="space-y-4">
      <ShapePresets
        onSelect={(shape) => updateConfig({ target_shape: shape })}
        tooltip={FIELD_TOOLTIPS.common_shapes}
      />
      
      <div className="bg-gray-50 p-3 rounded-md">
        <div className="text-sm font-medium text-gray-700 mb-2">重塑规则</div>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• 总元素数量必须保持不变</li>
          <li>• 使用 -1 自动计算某个维度的大小</li>
          <li>• 第一个维度通常是批量大小</li>
          <li>• 展平操作使用 [-1] 形状</li>
        </ul>
      </div>
    </div>
  );

  return (
    <NodeContainer
      title="Reshape"
      borderColor="border-indigo-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-indigo-50 p-2 rounded">
        <div className="font-medium text-indigo-700 mb-1">重塑层</div>
        <div>改变张量的形状而不改变数据内容，常用于连接不同类型的层</div>
        <div className="mt-1">
          当前目标: {getOutputDescription()}
        </div>
      </div>
    </NodeContainer>
  );
}

export default ReshapeNode;