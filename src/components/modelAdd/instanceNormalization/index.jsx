import React, { useEffect } from 'react';
import useStore from '@/store';
import NodeContainer from '../NodeContainer';
import InputField from '../InputField';

// 字段提示信息
const FIELD_TOOLTIPS = {
  axis: "归一化轴 - 指定要归一化的轴，-1表示最后一个轴（通道轴）",
  epsilon: "数值稳定性参数 - 防止除零错误的小常数，通常为1e-3",
  center: "是否使用beta参数 - 启用可学习的偏移参数",
  scale: "是否使用gamma参数 - 启用可学习的缩放参数",
  beta_initializer: "Beta初始化器 - beta参数的初始化方法",
  gamma_initializer: "Gamma初始化器 - gamma参数的初始化方法"
};

function InstanceNormalizationNode({ data, id }) {
  const { updateInstanceNormalizationConfig } = useStore();

  // 默认配置
  const defaultConfig = {
    axis: -1,
    epsilon: 0.001,
    center: true,
    scale: true,
    beta_initializer: 'zeros',
    gamma_initializer: 'ones'
  };

  useEffect(() => {
    const newData = { ...defaultConfig, ...data };
    if (JSON.stringify(newData) !== JSON.stringify(data)) {
      updateInstanceNormalizationConfig(id, newData);
    }
  }, []);

  const handleInputChange = (field, value) => {
    const newData = { ...data, [field]: value };
    updateInstanceNormalizationConfig(id, newData);
  };

  // 基本配置
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
      
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="Center"
          type="checkbox"
          value={data.center !== undefined ? data.center : defaultConfig.center}
          onChange={(value) => handleInputChange('center', value)}
          tooltip={FIELD_TOOLTIPS.center}
        />
        <InputField
          label="Scale"
          type="checkbox"
          value={data.scale !== undefined ? data.scale : defaultConfig.scale}
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
        label="Epsilon"
        type="number"
        value={data.epsilon || defaultConfig.epsilon}
        onChange={(value) => handleInputChange('epsilon', value)}
        min="1e-8"
        max="0.01"
        step="0.0001"
        tooltip={FIELD_TOOLTIPS.epsilon}
      />
      
      <InputField
        label="Beta初始化器"
        type="select"
        value={data.beta_initializer || defaultConfig.beta_initializer}
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
        value={data.gamma_initializer || defaultConfig.gamma_initializer}
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
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>实例归一化：</strong>对每个样本的每个通道独立进行归一化，常用于风格迁移任务
        </p>
      </div>
    </div>
  );

  return (
    <NodeContainer
      title="Instance Normalization"
      type="normalization"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
};

export default InstanceNormalizationNode; 