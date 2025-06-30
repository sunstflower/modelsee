import React, { useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store';

// 字段提示信息
const FIELD_TOOLTIPS = {
  padding: "填充规格。可以是整数、2个整数的元组或2个2元组的元组。指定在高度和宽度维度上的填充"
};

// 填充配置组件
const PaddingSelector = ({ label, value, onChange, tooltip }) => {
  const [mode, setMode] = useState(
    typeof value === 'number' ? 'uniform' :
    Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' ? 'symmetric' :
    'asymmetric'
  );

  const presets = [
    { value: 1, label: '1像素', description: '四周各填充1像素' },
    { value: 2, label: '2像素', description: '四周各填充2像素' },
    { value: 3, label: '3像素', description: '四周各填充3像素' },
    { value: [1, 2], label: '高1宽2', description: '高度填充1，宽度填充2' },
    { value: [2, 1], label: '高2宽1', description: '高度填充2，宽度填充1' }
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
    if (!isNaN(num) && num >= 0 && num <= 20) {
      onChange(num);
    }
  };

  const handleSymmetricChange = (index, val) => {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 0 && num <= 20) {
      const newValue = [...(Array.isArray(value) ? value : [1, 1])];
      newValue[index] = num;
      onChange(newValue);
    }
  };

  const handleAsymmetricChange = (dim, side, val) => {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 0 && num <= 20) {
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
        <div className="text-sm font-medium text-gray-600">填充模式</div>
        <div className="flex space-x-2">
          {[
            { key: 'uniform', label: '统一填充' },
            { key: 'symmetric', label: '对称填充' },
            { key: 'asymmetric', label: '非对称填充' }
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
          <div className="text-sm text-gray-600">四周填充像素数</div>
          <input
            type="number"
            value={typeof value === 'number' ? value : 1}
            onChange={(e) => handleUniformChange(e.target.value)}
            min="0"
            max="20"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
      
      {mode === 'symmetric' && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">分别设置高度和宽度填充</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">高度填充</div>
              <input
                type="number"
                value={Array.isArray(value) && typeof value[0] === 'number' ? value[0] : 1}
                onChange={(e) => handleSymmetricChange(0, e.target.value)}
                min="0"
                max="20"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">宽度填充</div>
              <input
                type="number"
                value={Array.isArray(value) && typeof value[1] === 'number' ? value[1] : 1}
                onChange={(e) => handleSymmetricChange(1, e.target.value)}
                min="0"
                max="20"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
      
      {mode === 'asymmetric' && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">分别设置上下左右填充</div>
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
                  max="20"
                  className="w-1/2 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="下"
                  value={Array.isArray(value) && Array.isArray(value[0]) ? value[0][1] : 1}
                  onChange={(e) => handleAsymmetricChange(0, 1, e.target.value)}
                  min="0"
                  max="20"
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
                  max="20"
                  className="w-1/2 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="右"
                  value={Array.isArray(value) && Array.isArray(value[1]) ? value[1][1] : 1}
                  onChange={(e) => handleAsymmetricChange(1, 1, e.target.value)}
                  min="0"
                  max="20"
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
          {typeof value === 'number' && `四周各填充 ${value} 像素`}
          {Array.isArray(value) && typeof value[0] === 'number' && `高度填充 ${value[0]}，宽度填充 ${value[1]}`}
          {Array.isArray(value) && Array.isArray(value[0]) && 
            `上${value[0][0]} 下${value[0][1]} 左${value[1][0]} 右${value[1][1]}`}
        </div>
      </div>
    </div>
  );
};

function ZeroPadding2DNode({ data }) {
  const { zeroPadding2dConfigs, updateZeroPadding2dConfig } = useStore();
  const configIndex = data.index || 0;
  
  // 使用后端数据结构的默认配置
  const defaultConfig = {
    padding: 1
  };
  
  const config = zeroPadding2dConfigs[configIndex] || defaultConfig;

  const updateConfig = (updates) => {
    updateZeroPadding2dConfig(configIndex, { ...config, ...updates });
  };

  // 基本配置
  const basicConfig = (
    <div className="space-y-4">
      <PaddingSelector
        label="填充配置"
        value={config.padding}
        onChange={(newPadding) => updateConfig({ padding: newPadding })}
        tooltip={FIELD_TOOLTIPS.padding}
      />
    </div>
  );

  // 高级配置
  const advancedConfig = (
    <div className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-blue-800 mb-2">ZeroPadding2D层说明</div>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 在输入的高度和宽度维度周围添加零填充</li>
          <li>• 不改变通道数，只改变空间尺寸</li>
          <li>• 常用于保持卷积后的尺寸或增加感受野</li>
          <li>• 填充值始终为0，不可学习</li>
        </ul>
      </div>
      
      <div className="bg-green-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-green-800 mb-2">使用场景</div>
        <ul className="text-xs text-green-700 space-y-1">
          <li>• <strong>尺寸匹配</strong>: 使不同层的输出尺寸匹配</li>
          <li>• <strong>边界保护</strong>: 防止卷积操作丢失边界信息</li>
          <li>• <strong>感受野扩展</strong>: 增加后续层的感受野</li>
          <li>• <strong>特征对齐</strong>: 在跳跃连接中对齐特征图</li>
        </ul>
      </div>
      
      <div className="bg-amber-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-amber-800 mb-2">与其他填充的区别</div>
        <ul className="text-xs text-amber-700 space-y-1">
          <li>• <strong>ZeroPadding</strong>: 填充固定的零值</li>
          <li>• <strong>Conv层的padding</strong>: 卷积操作内置的填充</li>
          <li>• <strong>ReflectPadding</strong>: 镜像填充（TensorFlow中较少）</li>
          <li>• ZeroPadding更灵活，可以精确控制每个方向的填充量</li>
        </ul>
      </div>
    </div>
  );

  return (
    <NodeContainer
      title="ZeroPadding2D"
      borderColor="border-slate-400"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    >
      <div className="text-xs text-gray-500 bg-slate-50 p-2 rounded">
        <div className="font-medium text-slate-700 mb-1">二维零填充层</div>
        <div>在输入的高度和宽度维度周围添加零填充</div>
        <div className="mt-1">
          当前配置: 
          {typeof config.padding === 'number' && ` 四周各${config.padding}像素`}
          {Array.isArray(config.padding) && typeof config.padding[0] === 'number' && 
            ` 高${config.padding[0]} 宽${config.padding[1]}`}
          {Array.isArray(config.padding) && Array.isArray(config.padding[0]) && 
            ` 上${config.padding[0][0]} 下${config.padding[0][1]} 左${config.padding[1][0]} 右${config.padding[1][1]}`}
        </div>
      </div>
    </NodeContainer>
  );
}

export default ZeroPadding2DNode; 