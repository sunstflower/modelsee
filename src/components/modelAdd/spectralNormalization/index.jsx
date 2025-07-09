import React, { useEffect } from 'react';
import useStore from '@/store';

import NodeContainer from '../NodeContainer';
import InputField from '../InputField';

const FIELD_TOOLTIPS = {
  power_iterations: "幂迭代次数 - 计算最大奇异值的迭代次数，通常为1",
  name: "层名称 - 该层的自定义名称，用于模型可视化"
};

function SpectralNormalizationNode({ data, id }) {
  const { updateSpectralNormalizationConfig } = useStore();

  const defaultConfig = {
    power_iterations: 1,
    name: null
  };

  useEffect(() => {
    const newData = { ...defaultConfig, ...data };
    if (JSON.stringify(newData) !== JSON.stringify(data)) {
      updateSpectralNormalizationConfig(id, newData);
    }
  }, []);

  const handleInputChange = (field, value) => {
    const newData = { ...data, [field]: value };
    updateSpectralNormalizationConfig(id, newData);
  };

  const basicConfig = (
    <div className="space-y-3">
      <InputField
        label="幂迭代次数"
        type="number"
        value={data.power_iterations || defaultConfig.power_iterations}
        onChange={(value) => handleInputChange('power_iterations', value)}
        min="1"
        max="10"
        tooltip={FIELD_TOOLTIPS.power_iterations}
      />
      
      <div className="p-3 bg-red-50 rounded-lg">
        <h4 className="font-medium text-red-800 mb-2">谱归一化</h4>
        <p className="text-sm text-red-700">
          通过最大奇异值归一化权重矩阵，控制Lipschitz常数
        </p>
      </div>
    </div>
  );

  const advancedConfig = (
    <div className="space-y-3">
      <InputField
        label="层名称（可选）"
        type="text"
        value={data.name || ''}
        onChange={(value) => handleInputChange('name', value || null)}
        placeholder="自定义层名称"
        tooltip={FIELD_TOOLTIPS.name}
      />
      
      <div className="mt-4 space-y-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">使用场景</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 生成对抗网络（GAN）</li>
            <li>• 判别器网络稳定化</li>
            <li>• 深度神经网络正则化</li>
            <li>• 梯度爆炸问题缓解</li>
          </ul>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">数学原理</h4>
          <p className="text-sm text-green-700">
            W_SN = W / σ(W)，其中σ(W)是权重矩阵W的最大奇异值
          </p>
        </div>
        
        <div className="p-3 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">优势</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 提高训练稳定性</li>
            <li>• 防止梯度爆炸</li>
            <li>• 改善生成质量</li>
            <li>• 计算效率高</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <NodeContainer
      
      title="Spectral Normalization"
      type="regularization"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
};

export default SpectralNormalizationNode; 