import React, { useEffect } from 'react';
import useStore from '@/store';

import NodeContainer from '../NodeContainer';
import InputField from '../InputField';

const FIELD_TOOLTIPS = {
  units: "注意力单元数 - 加性注意力机制的输出维度，通常为64、128、256等",
  use_scale: "是否使用缩放 - 启用缩放参数，有助于训练稳定性",
  dropout: "Dropout比率 - 注意力权重的随机丢弃比例，防止过拟合",
  activation: "激活函数 - 应用于注意力分数的激活函数",
  use_bias: "是否使用偏置 - 在线性变换中添加偏置项"
};

function AdditiveAttentionNode({ data, id }) {
  const { updateAdditiveAttentionConfig } = useStore();

  const defaultConfig = {
    units: 64,
    use_scale: false,
    dropout: 0.0,
    activation: 'tanh',
    use_bias: true
  };

  useEffect(() => {
    const newData = { ...defaultConfig, ...data };
    if (JSON.stringify(newData) !== JSON.stringify(data)) {
      updateAdditiveAttentionConfig(id, newData);
    }
  }, []);

  const handleInputChange = (field, value) => {
    const newData = { ...data, [field]: value };
    updateAdditiveAttentionConfig(id, newData);
  };

  const basicConfig = (
    <div className="space-y-3">
      <InputField
        label="注意力单元数"
        type="number"
        value={data.units || defaultConfig.units}
        onChange={(value) => handleInputChange('units', value)}
        min="8"
        max="512"
        tooltip={FIELD_TOOLTIPS.units}
      />
      
      <InputField
        label="激活函数"
        type="select"
        value={data.activation || defaultConfig.activation}
        onChange={(value) => handleInputChange('activation', value)}
        options={[
          { value: 'tanh', label: 'Tanh' },
          { value: 'relu', label: 'ReLU' },
          { value: 'linear', label: 'Linear' },
          { value: 'sigmoid', label: 'Sigmoid' }
        ]}
        tooltip={FIELD_TOOLTIPS.activation}
      />
      
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="使用缩放"
          type="checkbox"
          value={data.use_scale !== undefined ? data.use_scale : defaultConfig.use_scale}
          onChange={(value) => handleInputChange('use_scale', value)}
          tooltip={FIELD_TOOLTIPS.use_scale}
        />
        <InputField
          label="使用偏置"
          type="checkbox"
          value={data.use_bias !== undefined ? data.use_bias : defaultConfig.use_bias}
          onChange={(value) => handleInputChange('use_bias', value)}
          tooltip={FIELD_TOOLTIPS.use_bias}
        />
      </div>
    </div>
  );

  const advancedConfig = (
    <div className="space-y-3">
      <div className="space-y-2">
        <InputField
          label={`Dropout比率: ${((data.dropout || defaultConfig.dropout) * 100).toFixed(1)}%`}
          type="range"
          value={data.dropout || defaultConfig.dropout}
          onChange={(value) => handleInputChange('dropout', parseFloat(value))}
          min="0"
          max="0.5"
          step="0.01"
          tooltip={FIELD_TOOLTIPS.dropout}
        />
        <InputField
          label=""
          type="number"
          value={data.dropout || defaultConfig.dropout}
          onChange={(value) => handleInputChange('dropout', value)}
          min="0"
          max="0.5"
          step="0.01"
          placeholder="精确值"
        />
      </div>
      
      <div className="mt-4 space-y-3">
        <div className="p-3 bg-orange-50 rounded-lg">
          <h4 className="font-medium text-orange-800 mb-2">加性注意力机制（Bahdanau注意力）</h4>
          <p className="text-sm text-orange-700">
            使用前馈网络计算注意力权重，适用于序列到序列任务
          </p>
        </div>
        
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">使用场景</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 神经机器翻译</li>
            <li>• 文本摘要</li>
            <li>• 语音识别</li>
            <li>• 序列标注</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <NodeContainer
      
      title="Additive Attention"
      type="attention"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
};

export default AdditiveAttentionNode; 