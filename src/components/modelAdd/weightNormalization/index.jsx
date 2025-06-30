import React, { useEffect } from 'react';
import { useStoreActions, useStoreState } from 'easy-peasy';
import NodeContainer from '../NodeContainer';
import InputField from '../InputField';

const FIELD_TOOLTIPS = {
  dim: "归一化维度 - 指定权重归一化的维度，通常为0（输出维度）",
  name: "层名称 - 该层的自定义名称，用于模型可视化"
};

const WeightNormalization = ({ id, data }) => {
  const updateNodeData = useStoreActions(actions => actions.updateNodeData);
  const nodes = useStoreState(state => state.nodes);
  
  const nodeData = nodes.find(node => node.id === id)?.data || {};

  const defaultConfig = {
    dim: 0,
    name: null
  };

  useEffect(() => {
    const newData = { ...defaultConfig, ...nodeData };
    if (JSON.stringify(newData) !== JSON.stringify(nodeData)) {
      updateNodeData({ id, data: newData });
    }
  }, []);

  const handleInputChange = (field, value) => {
    const parsedValue = field === 'dim' ? 
      parseInt(value) || defaultConfig[field] : value;
    
    updateNodeData({
      id,
      data: { ...nodeData, [field]: parsedValue }
    });
  };

  const basicConfig = (
    <div className="space-y-3">
      <InputField
        label="归一化维度"
        type="number"
        value={nodeData.dim || defaultConfig.dim}
        onChange={(value) => handleInputChange('dim', value)}
        min="0"
        max="3"
        tooltip={FIELD_TOOLTIPS.dim}
      />
      
      <div className="p-3 bg-pink-50 rounded-lg">
        <h4 className="font-medium text-pink-800 mb-2">权重归一化</h4>
        <p className="text-sm text-pink-700">
          将权重向量分解为大小和方向，分别进行参数化
        </p>
      </div>
    </div>
  );

  const advancedConfig = (
    <div className="space-y-3">
      <InputField
        label="层名称（可选）"
        type="text"
        value={nodeData.name || ''}
        onChange={(value) => handleInputChange('name', value || null)}
        placeholder="自定义层名称"
        tooltip={FIELD_TOOLTIPS.name}
      />
      
      <div className="mt-4 space-y-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">使用场景</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 循环神经网络</li>
            <li>• 生成模型</li>
            <li>• 强化学习</li>
            <li>• 深度网络加速收敛</li>
          </ul>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">数学原理</h4>
          <p className="text-sm text-green-700">
            w = g * v / ||v||，其中g是标量参数，v是方向向量
          </p>
        </div>
        
        <div className="p-3 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">优势</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 加速训练收敛</li>
            <li>• 改善梯度流</li>
            <li>• 减少内部协变量偏移</li>
            <li>• 计算开销小</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <NodeContainer
      id={id}
      title="Weight Normalization"
      type="normalization"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
};

export default WeightNormalization; 