import React, { useEffect } from 'react';
import { useStoreActions, useStoreState } from 'easy-peasy';
import NodeContainer from '../NodeContainer';
import InputField from '../InputField';

const FIELD_TOOLTIPS = {
  axis: "归一化轴 - 指定要归一化的轴，-1表示最后一个轴（特征轴）",
  name: "层名称 - 该层的自定义名称，用于模型可视化"
};

const UnitNormalization = ({ id, data }) => {
  const updateNodeData = useStoreActions(actions => actions.updateNodeData);
  const nodes = useStoreState(state => state.nodes);
  
  const nodeData = nodes.find(node => node.id === id)?.data || {};

  const defaultConfig = {
    axis: -1,
    name: null
  };

  useEffect(() => {
    const newData = { ...defaultConfig, ...nodeData };
    if (JSON.stringify(newData) !== JSON.stringify(nodeData)) {
      updateNodeData({ id, data: newData });
    }
  }, []);

  const handleInputChange = (field, value) => {
    const parsedValue = field === 'axis' ? 
      parseInt(value) || defaultConfig[field] : value;
    
    updateNodeData({
      id,
      data: { ...nodeData, [field]: parsedValue }
    });
  };

  const basicConfig = (
    <div className="space-y-3">
      <InputField
        label="归一化轴"
        type="number"
        value={nodeData.axis || defaultConfig.axis}
        onChange={(value) => handleInputChange('axis', value)}
        min="-10"
        max="10"
        tooltip={FIELD_TOOLTIPS.axis}
      />
      
      <div className="p-3 bg-teal-50 rounded-lg">
        <h4 className="font-medium text-teal-800 mb-2">单位归一化（L2归一化）</h4>
        <p className="text-sm text-teal-700">
          将向量归一化为单位长度，等价于L2归一化
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
            <li>• 特征向量标准化</li>
            <li>• 嵌入层后处理</li>
            <li>• 相似度计算预处理</li>
            <li>• 梯度裁剪替代方案</li>
          </ul>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">数学原理</h4>
          <p className="text-sm text-green-700">
            output = input / ||input||₂，使输出向量的L2范数等于1
          </p>
        </div>
        
        <div className="p-3 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">注意事项</h4>
          <p className="text-sm text-yellow-700">
            当输入向量为零向量时，输出也为零向量
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <NodeContainer
      id={id}
      title="Unit Normalization"
      type="normalization"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
};

export default UnitNormalization; 