import React, { useEffect } from 'react';
import { useStoreActions, useStoreState } from 'easy-peasy';
import InputField from '../InputField';

// 字段提示信息
const FIELD_TOOLTIPS = {
  units: "注意力单元数 - 注意力机制的输出维度，通常为64、128、256等",
  use_scale: "是否使用缩放 - 启用温度缩放参数，有助于训练稳定性",
  dropout: "Dropout比率 - 注意力权重的随机丢弃比例，防止过拟合",
  activation: "激活函数 - 应用于注意力分数的激活函数",
  use_bias: "是否使用偏置 - 在线性变换中添加偏置项"
};

const SelfAttention = ({ id, data }) => {
  const updateNodeData = useStoreActions(actions => actions.updateNodeData);
  const nodes = useStoreState(state => state.nodes);
  
  const nodeData = nodes.find(node => node.id === id)?.data || {};

  // 默认配置
  const defaultConfig = {
    units: 64,
    use_scale: true,
    dropout: 0.0,
    activation: 'linear',
    use_bias: true
  };

  useEffect(() => {
    const newData = { ...defaultConfig, ...nodeData };
    if (JSON.stringify(newData) !== JSON.stringify(nodeData)) {
      updateNodeData({ id, data: newData });
    }
  }, []);

  const handleInputChange = (field, value) => {
    const parsedValue = field === 'units' ? 
      parseInt(value) || defaultConfig[field] : 
      field === 'dropout' ? parseFloat(value) || defaultConfig[field] :
      field === 'use_scale' || field === 'use_bias' ? value : value;
    
    updateNodeData({
      id,
      data: { ...nodeData, [field]: parsedValue }
    });
  };

  // 基本配置
  const basicConfig = (
    <div className="space-y-3">
      <InputField
        label="注意力单元数"
        type="number"
        value={nodeData.units || defaultConfig.units}
        onChange={(value) => handleInputChange('units', value)}
        min="8"
        max="512"
        tooltip={FIELD_TOOLTIPS.units}
      />
      
      <InputField
        label="激活函数"
        type="select"
        value={nodeData.activation || defaultConfig.activation}
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
      
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="使用缩放"
          type="checkbox"
          value={nodeData.use_scale !== undefined ? nodeData.use_scale : defaultConfig.use_scale}
          onChange={(value) => handleInputChange('use_scale', value)}
          tooltip={FIELD_TOOLTIPS.use_scale}
        />
        <InputField
          label="使用偏置"
          type="checkbox"
          value={nodeData.use_bias !== undefined ? nodeData.use_bias : defaultConfig.use_bias}
          onChange={(value) => handleInputChange('use_bias', value)}
          tooltip={FIELD_TOOLTIPS.use_bias}
        />
      </div>
    </div>
  );

  // 高级配置
  const advancedConfig = (
    <div className="space-y-3">
      <div className="space-y-2">
        <InputField
          label={`Dropout比率: ${(nodeData.dropout || defaultConfig.dropout * 100).toFixed(1)}%`}
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
      
      <div className="mt-4 space-y-3">
        <div className="p-3 bg-purple-50 rounded-lg">
          <h4 className="font-medium text-purple-800 mb-2">自注意力机制</h4>
          <p className="text-sm text-purple-700">
            允许序列中的每个位置关注序列中的所有位置，捕获长距离依赖关系
          </p>
        </div>
        
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">使用场景</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 自然语言处理任务</li>
            <li>• 序列建模</li>
            <li>• 机器翻译</li>
            <li>• 文本分类</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return { basicConfig, advancedConfig };
};

export default SelfAttention; 