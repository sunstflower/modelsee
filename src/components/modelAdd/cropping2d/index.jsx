import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  cropping: "裁剪规格。可以是整数、2个整数的元组或2个2元组的元组。指定在高度和宽度维度上要裁剪的像素数"
};

// 裁剪配置组件
const CroppingSelector = ({ label, value, onChange, tooltip }) => {
  const [mode, setMode] = useState(
    typeof value === 'number' ? 'uniform' :
    Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' ? 'symmetric' :
    'asymmetric'
  );

  const presets = [
    { value: 1, label: '1像素', description: '四周各裁剪1像素' },
    { value: 2, label: '2像素', description: '四周各裁剪2像素' },
    { value: [1, 2], label: '高1宽2', description: '高度裁剪1，宽度裁剪2' },
    { value: [2, 1], label: '高2宽1', description: '高度裁剪2，宽度裁剪1' },
    { value: [[1, 1], [2, 2]], label: '非对称', description: '上下各1，左右各2' }
  ];

  const handlePresetChange = (preset) => {
    onChange(preset);
    setMode(
      typeof preset === 'number' ? 'uniform' :
      Array.isArray(preset) && preset.length === 2 && typeof preset[0] === 'number' ? 'symmetric' :
      'asymmetric'
    );
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode === 'uniform') {
      onChange(1);
    } else if (newMode === 'symmetric') {
      onChange([1, 1]);
    } else {
      onChange([[1, 1], [1, 1]]);
    }
  };

  const handleUniformChange = (val) => {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 0 && num <= 50) {
      onChange(num);
    }
  };

  const handleSymmetricChange = (index, val) => {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 0 && num <= 50) {
      const newValue = [...(Array.isArray(value) ? value : [1, 1])];
      newValue[index] = num;
      onChange(newValue);
    }
  };

  const handleAsymmetricChange = (dim, side, val) => {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 0 && num <= 50) {
      const currentValue = Array.isArray(value) && Array.isArray(value[0]) ? value : [[1, 1], [1, 1]];
      const newValue = currentValue.map(arr => [...arr]);
      newValue[dim][side] = num;
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700" title={tooltip}>
        {label}
      </label>
      
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-600">预设配置</div>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => handlePresetChange(preset.value)}
              className={`p-2 text-sm rounded border transition-colors text-left ${
                JSON.stringify(value) === JSON.stringify(preset.value)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{preset.label}</div>
              <div className="text-xs opacity-75">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-600">裁剪模式</div>
        <div className="flex space-x-2">
          {[
            { key: 'uniform', label: '统一裁剪' },
            { key: 'symmetric', label: '对称裁剪' },
            { key: 'asymmetric', label: '非对称裁剪' }
          ].map(modeOption => (
            <button
              key={modeOption.key}
              onClick={() => handleModeChange(modeOption.key)}
              className={`px-3 py-2 text-sm rounded border transition-colors ${
                mode === modeOption.key
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {modeOption.label}
            </button>
          ))}
        </div>
      </div>
      
      {mode === 'uniform' && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">四周裁剪像素数</div>
          <input
            type="number"
            value={typeof value === 'number' ? value : 1}
            onChange={(e) => handleUniformChange(e.target.value)}
            min="0"
            max="50"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
      
      {mode === 'symmetric' && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">分别设置高度和宽度裁剪</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">高度裁剪</div>
              <input
                type="number"
                value={Array.isArray(value) && typeof value[0] === 'number' ? value[0] : 1}
                onChange={(e) => handleSymmetricChange(0, e.target.value)}
                min="0"
                max="50"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">宽度裁剪</div>
              <input
                type="number"
                value={Array.isArray(value) && typeof value[1] === 'number' ? value[1] : 1}
                onChange={(e) => handleSymmetricChange(1, e.target.value)}
                min="0"
                max="50"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
      
      {mode === 'asymmetric' && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">分别设置上下左右裁剪</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">高度 (上, 下)</div>
              <div className="flex space-x-1">
                <input
                  type="number"
                  placeholder="上"
                  value={Array.isArray(value) && Array.isArray(value[0]) ? value[0][0] : 1}
                  onChange={(e) => handleAsymmetricChange(0, 0, e.target.value)}
                  min="0"
                  max="50"
                  className="w-1/2 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="下"
                  value={Array.isArray(value) && Array.isArray(value[0]) ? value[0][1] : 1}
                  onChange={(e) => handleAsymmetricChange(0, 1, e.target.value)}
                  min="0"
                  max="50"
                  className="w-1/2 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">宽度 (左, 右)</div>
              <div className="flex space-x-1">
                <input
                  type="number"
                  placeholder="左"
                  value={Array.isArray(value) && Array.isArray(value[1]) ? value[1][0] : 1}
                  onChange={(e) => handleAsymmetricChange(1, 0, e.target.value)}
                  min="0"
                  max="50"
                  className="w-1/2 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="右"
                  value={Array.isArray(value) && Array.isArray(value[1]) ? value[1][1] : 1}
                  onChange={(e) => handleAsymmetricChange(1, 1, e.target.value)}
                  min="0"
                  max="50"
                  className="w-1/2 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-gray-50 p-2 rounded text-xs">
        <div className="font-medium text-gray-700 mb-1">当前配置</div>
        <div className="text-gray-600">
          {typeof value === 'number' && `四周各裁剪 ${value} 像素`}
          {Array.isArray(value) && typeof value[0] === 'number' && `高度裁剪 ${value[0]}，宽度裁剪 ${value[1]}`}
          {Array.isArray(value) && Array.isArray(value[0]) && 
            `上${value[0][0]} 下${value[0][1]} 左${value[1][0]} 右${value[1][1]}`}
        </div>
      </div>
    </div>
  );
};

function Cropping2DNode({ data }) {
  const { cropping2dConfigs, updateCropping2dConfig } = useStore();
  const configIndex = data.index || 0;
  
  const defaultConfig = {
    cropping: 1
  };
  
  const config = cropping2dConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateCropping2dConfig(configIndex, { ...config, ...updates });
  };

  const basicConfig = (
    <div className="space-y-4">
      <CroppingSelector
        label="裁剪配置"
        value={config.cropping}
        onChange={(newCropping) => updateConfig({ cropping: newCropping })}
        tooltip={FIELD_TOOLTIPS.cropping}
      />
    </div>
  );

  const advancedConfig = (
    <div className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-blue-800 mb-2">Cropping2D层说明</div>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 从输入的高度和宽度维度裁剪指定数量的像素</li>
          <li>• 减少特征图的空间尺寸</li>
          <li>• 常用于去除边界填充或调整尺寸</li>
          <li>• 与ZeroPadding2D操作相反</li>
        </ul>
      </div>
      
      <div className="bg-green-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-green-800 mb-2">使用场景</div>
        <ul className="text-xs text-green-700 space-y-1">
          <li>• <strong>尺寸调整</strong>: 精确控制特征图大小</li>
          <li>• <strong>边界去除</strong>: 去除卷积产生的边界效应</li>
          <li>• <strong>中心裁剪</strong>: 保留图像中心区域</li>
          <li>• <strong>数据增强</strong>: 作为数据增强的一部分</li>
        </ul>
      </div>
      
      <div className="bg-amber-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-amber-800 mb-2">注意事项</div>
        <ul className="text-xs text-amber-700 space-y-1">
          <li>• 确保裁剪后的尺寸仍然为正数</li>
          <li>• 过度裁剪可能丢失重要信息</li>
          <li>• 与后续层的输入要求保持一致</li>
          <li>• 在U-Net等架构中用于尺寸匹配</li>
        </ul>
      </div>
    </div>
  );

  return (
    <NodeContainer
      title="Cropping2D"
      borderColor="border-orange-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-orange-50 p-2 rounded">
        <div className="font-medium text-orange-700 mb-1">二维裁剪层</div>
        <div>从输入的高度和宽度维度裁剪指定数量的像素</div>
        <div className="mt-1">
          当前配置: 
          {typeof config.cropping === 'number' && ` 四周各${config.cropping}像素`}
          {Array.isArray(config.cropping) && typeof config.cropping[0] === 'number' && 
            ` 高${config.cropping[0]} 宽${config.cropping[1]}`}
          {Array.isArray(config.cropping) && Array.isArray(config.cropping[0]) && 
            ` 上${config.cropping[0][0]} 下${config.cropping[0][1]} 左${config.cropping[1][0]} 右${config.cropping[1][1]}`}
        </div>
      </div>
    </NodeContainer>
  );
}

export default Cropping2DNode; 