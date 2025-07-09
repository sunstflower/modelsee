import React, { useEffect } from 'react';
import useStore from '@/store';

import NodeContainer from '../NodeContainer';
import InputField from '../InputField';

const FIELD_TOOLTIPS = {
  axis: "归一化轴 - 指定要归一化的轴，-1表示最后一个轴（特征轴）",
  epsilon: "数值稳定性参数 - 防止除零错误的小常数，通常为1e-12",
  name: "层名称 - 该层的自定义名称，用于模型可视化"
};

function CosineNormalizationNode({ data, id }) {
  const { updateCosineNormalizationConfig } = useStore();

  const defaultConfig = {
    axis: -1,
    epsilon: 1e-12,
    name: null
  };

  useEffect(() => {
    const newData = { ...defaultConfig, ...data };
    if (JSON.stringify(newData) !== JSON.stringify(data)) {
      updateCosineNormalizationConfig(id, newData);
    }
  }, []);

  const handleInputChange = (field, value) => {
    const newData = { ...data, [field]: value };
    updateCosineNormalizationConfig(id, newData);
  };

  const basicConfig = (
    <div className="space-y-3">
      <InputField
        label="归一化轴"
        type="number"
        value={data.axis || defaultConfig.axis}
        onChange={(value) => handleInputChange('axis', value)}
        min="-10"
        max="10"
        tooltip={FIELD_TOOLTIPS.axis}
      />
      
      <div className="p-3 bg-cyan-50 rounded-lg">
        <h4 className="font-medium text-cyan-800 mb-2">余弦归一化</h4>
        <p className="text-sm text-cyan-700">
          将向量归一化为单位长度，使其余弦相似度计算更加稳定
        </p>
      </div>
    </div>
  );

  const advancedConfig = (
    <div className="space-y-3">
      <InputField
        label="Epsilon"
        type="number"
        value={data.epsilon || defaultConfig.epsilon}
        onChange={(value) => handleInputChange('epsilon', value)}
        min="1e-15"
        max="1e-6"
        step="1e-12"
        tooltip={FIELD_TOOLTIPS.epsilon}
      />
      
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
            <li>• 文本相似度计算</li>
            <li>• 人脸识别</li>
            <li>• 推荐系统</li>
            <li>• 特征匹配</li>
          </ul>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">数学原理</h4>
          <p className="text-sm text-green-700">
            output = input / ||input||₂，将输入向量归一化为L2范数为1的单位向量
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <NodeContainer
      
      title="Cosine Normalization"
      type="normalization"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
};

export default CosineNormalizationNode; 