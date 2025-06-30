import React, { useEffect } from 'react';
import { useStoreActions, useStoreState } from 'easy-peasy';
import NodeContainer from '../NodeContainer';
import InputField from '../InputField';

// 字段提示信息
const FIELD_TOOLTIPS = {
  groups: "分组数量 - 将通道分成多少个组进行归一化，通常设置为32或通道数的因子",
  axis: "归一化轴 - 指定要归一化的轴，-1表示最后一个轴（通道轴）",
  epsilon: "数值稳定性参数 - 防止除零错误的小常数，通常为1e-3",
  center: "是否使用beta参数 - 启用可学习的偏移参数",
  scale: "是否使用gamma参数 - 启用可学习的缩放参数",
  beta_initializer: "Beta初始化器 - beta参数的初始化方法",
  gamma_initializer: "Gamma初始化器 - gamma参数的初始化方法"
};

const GroupNormalization = ({ id, data }) => {
  const updateNodeData = useStoreActions(actions => actions.updateNodeData);
  const nodes = useStoreState(state => state.nodes);
  
  const nodeData = nodes.find(node => node.id === id)?.data || {};

  // 默认配置
  const defaultConfig = {
    groups: 32,
    axis: -1,
    epsilon: 0.001,
    center: true,
    scale: true,
    beta_initializer: 'zeros',
    gamma_initializer: 'ones'
  };

  useEffect(() => {
    const newData = { ...defaultConfig, ...nodeData };
    if (JSON.stringify(newData) !== JSON.stringify(nodeData)) {
      updateNodeData({ id, data: newData });
    }
  }, []);

  const handleInputChange = (field, value) => {
    const parsedValue = field === 'groups' || field === 'axis' ? 
      parseInt(value) || defaultConfig[field] : 
      field === 'epsilon' ? parseFloat(value) || defaultConfig[field] :
      field === 'center' || field === 'scale' ? value : value;
    
    updateNodeData({
      id,
      data: { ...nodeData, [field]: parsedValue }
    });
  };

  // 基本配置
  const basicConfig = (
    <div className="space-y-3">
      <InputField
        label="分组数量"
        type="number"
        value={nodeData.groups || defaultConfig.groups}
        onChange={(value) => handleInputChange('groups', value)}
        min="1"
        max="128"
        tooltip={FIELD_TOOLTIPS.groups}
      />
      
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="Center"
          type="checkbox"
          value={nodeData.center !== undefined ? nodeData.center : defaultConfig.center}
          onChange={(value) => handleInputChange('center', value)}
          tooltip={FIELD_TOOLTIPS.center}
        />
        <InputField
          label="Scale"
          type="checkbox"
          value={nodeData.scale !== undefined ? nodeData.scale : defaultConfig.scale}
          onChange={(value) => handleInputChange('scale', value)}
          tooltip={FIELD_TOOLTIPS.scale}
        />
      </div>
    </div>
  );

  // 高级配置
  const advancedConfig = (
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
      
      <InputField
        label="Epsilon"
        type="number"
        value={nodeData.epsilon || defaultConfig.epsilon}
        onChange={(value) => handleInputChange('epsilon', value)}
        min="1e-8"
        max="0.01"
        step="0.0001"
        tooltip={FIELD_TOOLTIPS.epsilon}
      />
      
      <InputField
        label="Beta初始化器"
        type="select"
        value={nodeData.beta_initializer || defaultConfig.beta_initializer}
        onChange={(value) => handleInputChange('beta_initializer', value)}
        options={[
          { value: 'zeros', label: 'Zeros' },
          { value: 'ones', label: 'Ones' },
          { value: 'constant', label: 'Constant' },
          { value: 'random_normal', label: 'Random Normal' },
          { value: 'random_uniform', label: 'Random Uniform' }
        ]}
        tooltip={FIELD_TOOLTIPS.beta_initializer}
      />
      
      <InputField
        label="Gamma初始化器"
        type="select"
        value={nodeData.gamma_initializer || defaultConfig.gamma_initializer}
        onChange={(value) => handleInputChange('gamma_initializer', value)}
        options={[
          { value: 'ones', label: 'Ones' },
          { value: 'zeros', label: 'Zeros' },
          { value: 'constant', label: 'Constant' },
          { value: 'random_normal', label: 'Random Normal' },
          { value: 'random_uniform', label: 'Random Uniform' }
        ]}
        tooltip={FIELD_TOOLTIPS.gamma_initializer}
      />
    </div>
  );

  return (
    <NodeContainer
      id={id}
      title="Group Normalization"
      type="regularization"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
};

export default GroupNormalization; 