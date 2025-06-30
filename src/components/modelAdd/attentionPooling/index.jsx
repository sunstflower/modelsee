import React, { useEffect } from 'react';
import { useStoreActions, useStoreState } from 'easy-peasy';
import NodeContainer from '../NodeContainer';
import InputField from '../InputField';

const FIELD_TOOLTIPS = {
  pool_size: "池化大小 - 注意力池化的窗口大小，通常为2或4",
  dropout: "Dropout比率 - 注意力权重的随机丢弃比例，防止过拟合",
  activation: "激活函数 - 应用于池化结果的激活函数",
  use_bias: "是否使用偏置 - 在线性变换中添加偏置项",
  temperature: "温度参数 - 控制注意力分布的尖锐程度"
};

const AttentionPooling = ({ id, data }) => {
  const updateNodeData = useStoreActions(actions => actions.updateNodeData);
  const nodes = useStoreState(state => state.nodes);
  
  const nodeData = nodes.find(node => node.id === id)?.data || {};

  const defaultConfig = {
    pool_size: 2,
    dropout: 0.0,
    activation: 'linear',
    use_bias: true,
    temperature: 1.0
  };

  useEffect(() => {
    const newData = { ...defaultConfig, ...nodeData };
    if (JSON.stringify(newData) !== JSON.stringify(nodeData)) {
      updateNodeData({ id, data: newData });
    }
  }, []);

  const handleInputChange = (field, value) => {
    const parsedValue = field === 'pool_size' ? 
      parseInt(value) || defaultConfig[field] : 
      field === 'dropout' || field === 'temperature' ? parseFloat(value) || defaultConfig[field] :
      field === 'use_bias' ? value : value;
    
    updateNodeData({
      id,
      data: { ...nodeData, [field]: parsedValue }
    });
  };

  const basicConfig = (
    <div className="space-y-3">
      <InputField
        label="池化大小"
        type="number"
        value={nodeData.pool_size || defaultConfig.pool_size}
        onChange={(value) => handleInputChange('pool_size', value)}
        min="1"
        max="10"
        tooltip={FIELD_TOOLTIPS.pool_size}
      />
      
      <InputField
        label="激活函数"
        type="select"
        value={nodeData.activation || defaultConfig.activation}
        onChange={(value) => handleInputChange('activation', value)}
        options={[
          { value: 'linear', label: 'Linear' },
          { value: 'relu', label: 'ReLU' },
          { value: 'tanh', label: 'Tanh' },
          { value: 'sigmoid', label: 'Sigmoid' },
          { value: 'softmax', label: 'Softmax' }
        ]}
        tooltip={FIELD_TOOLTIPS.activation}
      />
      
      <InputField
        label="使用偏置"
        type="checkbox"
        value={nodeData.use_bias !== undefined ? nodeData.use_bias : defaultConfig.use_bias}
        onChange={(value) => handleInputChange('use_bias', value)}
        tooltip={FIELD_TOOLTIPS.use_bias}
      />
    </div>
  );

  const advancedConfig = (
    <div className="space-y-3">
      <div className="space-y-2">
        <InputField
          label={`Dropout比率: ${((nodeData.dropout || defaultConfig.dropout) * 100).toFixed(1)}%`}
          type="range"
          value={nodeData.dropout || defaultConfig.dropout}
          onChange={(value) => handleInputChange('dropout', parseFloat(value))}
          min="0"
          max="0.5"
          step="0.01"
          tooltip={FIELD_TOOLTIPS.dropout}
        />
        <InputField
          label=""
          type="number"
          value={nodeData.dropout || defaultConfig.dropout}
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
        value={nodeData.temperature || defaultConfig.temperature}
        onChange={(value) => handleInputChange('temperature', value)}
        min="0.1"
        max="10.0"
        step="0.1"
        tooltip={FIELD_TOOLTIPS.temperature}
      />
      
      <div className="mt-4 space-y-3">
        <div className="p-3 bg-indigo-50 rounded-lg">
          <h4 className="font-medium text-indigo-800 mb-2">注意力池化</h4>
          <p className="text-sm text-indigo-700">
            使用注意力机制对特征进行加权池化，保留重要信息
          </p>
        </div>
        
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">使用场景</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 文档分类</li>
            <li>• 序列特征提取</li>
            <li>• 多实例学习</li>
            <li>• 时间序列分析</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <NodeContainer
      id={id}
      title="Attention Pooling"
      type="attention"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
};

export default AttentionPooling; 