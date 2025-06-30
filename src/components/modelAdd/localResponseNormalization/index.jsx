import React, { useEffect } from 'react';
import { useStoreActions, useStoreState } from 'easy-peasy';
import NodeContainer from '../NodeContainer';
import InputField from '../InputField';

const FIELD_TOOLTIPS = {
  depth_radius: "深度半径 - 归一化窗口的半径，通常为5",
  bias: "偏置参数 - 避免除零的偏置值，通常为1.0",
  alpha: "Alpha参数 - 缩放参数，通常为0.0001",
  beta: "Beta参数 - 指数参数，通常为0.75",
  name: "层名称 - 该层的自定义名称，用于模型可视化"
};

const LocalResponseNormalization = ({ id, data }) => {
  const updateNodeData = useStoreActions(actions => actions.updateNodeData);
  const nodes = useStoreState(state => state.nodes);
  
  const nodeData = nodes.find(node => node.id === id)?.data || {};

  const defaultConfig = {
    depth_radius: 5,
    bias: 1.0,
    alpha: 0.0001,
    beta: 0.75,
    name: null
  };

  useEffect(() => {
    const newData = { ...defaultConfig, ...nodeData };
    if (JSON.stringify(newData) !== JSON.stringify(nodeData)) {
      updateNodeData({ id, data: newData });
    }
  }, []);

  const handleInputChange = (field, value) => {
    const parsedValue = field === 'depth_radius' ? 
      parseInt(value) || defaultConfig[field] : 
      field === 'bias' || field === 'alpha' || field === 'beta' ? 
      parseFloat(value) || defaultConfig[field] : value;
    
    updateNodeData({
      id,
      data: { ...nodeData, [field]: parsedValue }
    });
  };

  const basicConfig = (
    <div className="space-y-3">
      <InputField
        label="深度半径"
        type="number"
        value={nodeData.depth_radius || defaultConfig.depth_radius}
        onChange={(value) => handleInputChange('depth_radius', value)}
        min="1"
        max="20"
        tooltip={FIELD_TOOLTIPS.depth_radius}
      />
      
      <InputField
        label="偏置参数"
        type="number"
        value={nodeData.bias || defaultConfig.bias}
        onChange={(value) => handleInputChange('bias', value)}
        min="0.1"
        max="10.0"
        step="0.1"
        tooltip={FIELD_TOOLTIPS.bias}
      />
      
      <div className="p-3 bg-purple-50 rounded-lg">
        <h4 className="font-medium text-purple-800 mb-2">局部响应归一化</h4>
        <p className="text-sm text-purple-700">
          在相邻通道间进行归一化，增强模型的泛化能力
        </p>
      </div>
    </div>
  );

  const advancedConfig = (
    <div className="space-y-3">
      <InputField
        label="Alpha参数"
        type="number"
        value={nodeData.alpha || defaultConfig.alpha}
        onChange={(value) => handleInputChange('alpha', value)}
        min="1e-5"
        max="0.01"
        step="0.0001"
        tooltip={FIELD_TOOLTIPS.alpha}
      />
      
      <InputField
        label="Beta参数"
        type="number"
        value={nodeData.beta || defaultConfig.beta}
        onChange={(value) => handleInputChange('beta', value)}
        min="0.1"
        max="2.0"
        step="0.05"
        tooltip={FIELD_TOOLTIPS.beta}
      />
      
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
            <li>• 卷积神经网络</li>
            <li>• 图像分类任务</li>
            <li>• 特征竞争机制</li>
            <li>• 传统CNN架构</li>
          </ul>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">数学公式</h4>
          <p className="text-sm text-green-700">
            output = input / (bias + alpha * sum(input²))^beta
          </p>
        </div>
        
        <div className="p-3 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">历史背景</h4>
          <p className="text-sm text-yellow-700">
            经典的AlexNet网络中使用的归一化方法，现已被BatchNorm替代
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <NodeContainer
      id={id}
      title="Local Response Normalization"
      type="normalization"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
};

export default LocalResponseNormalization; 