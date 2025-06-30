import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  rate: "丢弃率，介于0和1之间的浮点数。表示输入单元被乘以噪声的比例"
};

// 滑块组件
const SliderField = ({ label, value, onChange, min, max, step, tooltip }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700" title={tooltip}>
        {label}
      </label>
      <div className="flex items-center space-x-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= min && val <= max) {
                onChange(val);
              }
            }}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">
            {Math.round(value * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

function GaussianDropoutNode({ data }) {
  const { gaussianDropoutConfigs, updateGaussianDropoutConfig } = useStore();
  const configIndex = data.index || 0;
  
  const defaultConfig = {
    rate: 0.1
  };
  
  const config = gaussianDropoutConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateGaussianDropoutConfig(configIndex, { ...config, ...updates });
  };

  const basicConfig = (
    <div className="space-y-4">
      <SliderField
        label="丢弃率"
        value={config.rate}
        onChange={(newRate) => updateConfig({ rate: newRate })}
        min={0}
        max={0.9}
        step={0.01}
        tooltip={FIELD_TOOLTIPS.rate}
      />
      
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-blue-800 mb-2">Gaussian Dropout 特点</div>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 使用高斯噪声而不是二进制掩码</li>
          <li>• 噪声均值为1，方差与丢弃率相关</li>
          <li>• 提供更平滑的正则化效果</li>
          <li>• 适用于连续值输入</li>
        </ul>
      </div>
    </div>
  );

  const advancedConfig = (
    <div className="space-y-4">
      <div className="bg-green-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-green-800 mb-2">与标准Dropout的区别</div>
        <ul className="text-xs text-green-700 space-y-1">
          <li>• <strong>标准Dropout</strong>: 随机设置单元为0</li>
          <li>• <strong>Gaussian Dropout</strong>: 乘以高斯噪声</li>
          <li>• 高斯噪声提供更平滑的梯度</li>
          <li>• 在某些任务中可能有更好的性能</li>
        </ul>
      </div>
    </div>
  );

  return (
    <NodeContainer
      title="GaussianDropout"
      borderColor="border-violet-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-violet-50 p-2 rounded">
        <div className="font-medium text-violet-700 mb-1">高斯噪声Dropout层</div>
        <div>使用高斯噪声进行正则化，提供更平滑的正则化效果</div>
        <div className="mt-1">
          当前配置: {Math.round(config.rate * 100)}% 噪声率
        </div>
      </div>
    </NodeContainer>
  );
}

export default GaussianDropoutNode; 