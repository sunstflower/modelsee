import React, { useEffect } from 'react';
import useStore from '@/store';

import NodeContainer from '../NodeContainer';
import InputField from '../InputField';

// 字段提示信息
const FIELD_TOOLTIPS = {
  units: "注意力单元数 - 交叉注意力机制的输出维度，通常为64、128、256等",
  dropout: "Dropout比率 - 注意力权重的随机丢弃比例，防止过拟合",
  use_bias: "是否使用偏置 - 在线性变换中添加偏置项",
  activation: "激活函数 - 应用于注意力分数的激活函数",
  temperature: "温度参数 - 控制注意力分布的尖锐程度"
};

function CrossAttentionNode({ data, id }) {
  const { updateCrossAttentionConfig } = useStore();

  // 默认配置
  const defaultConfig = {
    units: 64,
    dropout: 0.0,
    use_bias: true,
    activation: 'linear',
    temperature: 1.0
  };

  useEffect(() => {
    const newData = { ...defaultConfig, ...data };
    if (JSON.stringify(newData) !== JSON.stringify(data)) {
      updateCrossAttentionConfig(id, newData);
    }
  }, []);

  const handleInputChange = (field, value) => {
    const newData = { ...data, [field]: value };
    updateCrossAttentionConfig(id, newData);
  };

  // 基本配置
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
          { value: 'linear', label: 'Linear' },
          { value: 'tanh', label: 'Tanh' },
          { value: 'relu', label: 'ReLU' },
          { value: 'softmax', label: 'Softmax' },
          { value: 'sigmoid', label: 'Sigmoid' }
        ]}
        tooltip={FIELD_TOOLTIPS.activation}
      />
      
      <InputField
        label="使用偏置"
        type="checkbox"
        value={data.use_bias !== undefined ? data.use_bias : defaultConfig.use_bias}
        onChange={(value) => handleInputChange('use_bias', value)}
        tooltip={FIELD_TOOLTIPS.use_bias}
      />
    </div>
  );

  // 高级配置
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
      
      <InputField
        label="温度参数"
        type="number"
        value={data.temperature || defaultConfig.temperature}
        onChange={(value) => handleInputChange('temperature', value)}
        min="0.1"
        max="10.0"
        step="0.1"
        tooltip={FIELD_TOOLTIPS.temperature}
      />
      
      <div className="mt-4 space-y-3">
        <div className="p-3 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">交叉注意力机制</h4>
          <p className="text-sm text-green-700">
            允许一个序列关注另一个序列，常用于编码器-解码器架构中
          </p>
        </div>
        
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">使用场景</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 机器翻译</li>
            <li>• 图像描述生成</li>
            <li>• 问答系统</li>
            <li>• 多模态融合</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <NodeContainer
      
      title="Cross Attention"
      type="attention"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
};

export default CrossAttentionNode; 