import React, { useEffect, useRef, useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 配置字段提示信息
const FIELD_TOOLTIPS = {
  pool_size: "池化窗口大小，决定每次池化操作覆盖的区域。常用2x2或3x3。",
  strides: "池化步长，控制池化窗口移动的步长。通常与池化大小相同以避免重叠。",
  padding: "填充方式。'valid'不填充，'same'填充保持输出尺寸。",
  data_format: "数据格式，指定输入张量的维度顺序。"
};

// 配置选项
const POOL_SIZE_OPTIONS = [
  { value: [2, 2], label: '2×2', description: '最常用的池化大小，减半特征图尺寸' },
  { value: [3, 3], label: '3×3', description: '较大的池化窗口，更强的降采样' },
  { value: [4, 4], label: '4×4', description: '大池化窗口，显著减少特征图尺寸' },
  { value: [1, 1], label: '1×1', description: '无池化效果，保持原始尺寸' }
];

const PADDING_OPTIONS = [
  { value: 'valid', label: 'Valid (无填充)', description: '不进行填充，输出尺寸会减小' },
  { value: 'same', label: 'Same (保持尺寸)', description: '填充使输出尺寸与输入相同' }
];

const DATA_FORMAT_OPTIONS = [
  { value: 'channels_last', label: 'Channels Last (NHWC)' },
  { value: 'channels_first', label: 'Channels First (NCHW)' }
];

// 输入字段组件
const InputField = ({ label, tooltip, children, required = false }) => (
  <div className="space-y-2">
    <label className="flex items-center text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
      <div className="group relative ml-2">
        <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-64 z-10">
          {tooltip}
        </div>
      </div>
    </label>
    {children}
  </div>
);

// 尺寸选择组件
const SizeSelector = ({ value, onChange, options, placeholder = "[2, 2]" }) => {
  const isCustom = !options.some(opt => 
    Array.isArray(opt.value) && Array.isArray(value) && 
    opt.value.length === value.length && 
    opt.value.every((v, i) => v === value[i])
  );

  const handleSelectChange = (e) => {
    const selectedValue = e.target.value;
    if (selectedValue === 'custom') return;
    
    const option = options.find(opt => JSON.stringify(opt.value) === selectedValue);
    if (option) {
      onChange(option.value);
    }
  };

  const handleCustomChange = (e) => {
    const val = e.target.value;
    try {
      if (val.includes(',') || val.includes('[')) {
        const parsed = JSON.parse(val.replace(/[^\d,\[\]]/g, ''));
        onChange(Array.isArray(parsed) ? parsed : [parsed, parsed]);
      } else {
        const num = parseInt(val);
        onChange(isNaN(num) ? [2, 2] : [num, num]);
      }
    } catch {
      onChange([2, 2]);
    }
  };

  return (
    <div className="space-y-2">
      <select
        value={isCustom ? 'custom' : JSON.stringify(value)}
        onChange={handleSelectChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      >
        {options.map(option => (
          <option key={JSON.stringify(option.value)} value={JSON.stringify(option.value)}>
            {option.label}
          </option>
        ))}
        <option value="custom">自定义</option>
      </select>
      
      {isCustom && (
        <input
          type="text"
          value={Array.isArray(value) ? `[${value.join(', ')}]` : value}
          onChange={handleCustomChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      )}
      
      <div className="text-xs text-gray-500">
        {options.find(opt => JSON.stringify(opt.value) === JSON.stringify(value))?.description || '自定义尺寸'}
      </div>
    </div>
  );
};

function MaxPooling2DNode({ data }) {
  const { maxPooling2dConfigs, updateMaxPooling2dConfig } = useStore();
  const configIndex = data.index || 0;
  const isInitialized = useRef(false);
  const [extraRaw, setExtraRaw] = useState('');
  const [extraError, setExtraError] = useState('');
  
  // 初始化配置
  useEffect(() => {
    if (isInitialized.current || (maxPooling2dConfigs[configIndex] && maxPooling2dConfigs[configIndex].pool_size)) {
      isInitialized.current = true;
      return;
    }
    
    isInitialized.current = true;
    
    // 根据后端数据结构设置默认值
    const defaultConfig = {
      pool_size: [2, 2],
      strides: null, // null表示使用与pool_size相同的值
      padding: 'valid',
      data_format: 'channels_last'
    };
    
    updateMaxPooling2dConfig(configIndex, defaultConfig);
    console.log(`MaxPooling2D层 ${configIndex} 设置默认值:`, defaultConfig);
  }, [configIndex, maxPooling2dConfigs, updateMaxPooling2dConfig]);
  
  const config = maxPooling2dConfigs[configIndex] || {
    pool_size: [2, 2],
    strides: null,
    padding: 'valid',
    data_format: 'channels_last',
    extraConfig: {}
  };

  useEffect(() => {
    try {
      setExtraRaw(JSON.stringify(config.extraConfig || {}, null, 2));
      setExtraError('');
    } catch {
      setExtraRaw('{}');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configIndex]);

  const handleConfigChange = (field, value) => {
    updateMaxPooling2dConfig(configIndex, { [field]: value });
  };

  // 基本配置项
  const basicConfig = (
    <div className="space-y-4">
      <InputField 
        label="池化窗口大小" 
        tooltip={FIELD_TOOLTIPS.pool_size}
        required
      >
        <SizeSelector
          value={config.pool_size || [2, 2]}
          onChange={(value) => handleConfigChange('pool_size', value)}
          options={POOL_SIZE_OPTIONS}
          placeholder="[2, 2]"
        />
      </InputField>

      <InputField 
        label="填充方式" 
        tooltip={FIELD_TOOLTIPS.padding}
        required
      >
        <select
          value={config.padding || 'valid'}
          onChange={(e) => handleConfigChange('padding', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {PADDING_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="text-xs text-gray-500 mt-1">
          {PADDING_OPTIONS.find(opt => opt.value === config.padding)?.description}
        </div>
      </InputField>
    </div>
  );

  // 高级配置项
  const advancedConfig = (
    <div className="space-y-4">
      <InputField 
        label="步长" 
        tooltip={FIELD_TOOLTIPS.strides}
      >
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.strides === null}
              onChange={(e) => {
                if (e.target.checked) {
                  handleConfigChange('strides', null);
                } else {
                  handleConfigChange('strides', config.pool_size || [2, 2]);
                }
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-600">使用与池化大小相同的步长</span>
          </div>
          
          {config.strides !== null && (
            <SizeSelector
              value={config.strides || [2, 2]}
              onChange={(value) => handleConfigChange('strides', value)}
              options={POOL_SIZE_OPTIONS}
              placeholder="[2, 2]"
            />
          )}
        </div>
      </InputField>

      <InputField 
        label="数据格式" 
        tooltip={FIELD_TOOLTIPS.data_format}
      >
        <select
          value={config.data_format || 'channels_last'}
          onChange={(e) => handleConfigChange('data_format', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {DATA_FORMAT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </InputField>

      <div className="space-y-2">
        <label className="flex items-center text-sm font-medium text-gray-700">
          额外TF/Keras参数 (JSON)
        </label>
        <textarea
          rows={6}
          value={extraRaw}
          onChange={(e) => setExtraRaw(e.target.value)}
          placeholder='{"data_format":"channels_first"}'
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
        />
        {extraError && <div className="text-xs text-red-600">{extraError}</div>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              try {
                const parsed = extraRaw ? JSON.parse(extraRaw) : {};
                updateMaxPooling2dConfig(configIndex, { extraConfig: parsed });
                setExtraError('');
              } catch (e) {
                setExtraError('JSON 解析失败');
              }
            }}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            保存额外参数
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <NodeContainer 
      title="MaxPooling2D Layer" 
      backgroundColor="white"
      borderColor="cyan-200"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
}

export default MaxPooling2DNode;



