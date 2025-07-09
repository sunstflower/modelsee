import React from 'react';
import NodeContainer from '../NodeContainer';
import InputField from '../InputField';

const FIELD_TOOLTIPS = {
  axis: "归一化轴 - 指定要归一化的轴，-1表示最后一个轴（特征轴）",
};

function UnitNormalizationNode({ data, id }) {
  const [config, setConfig] = React.useState({
    axis: -1
  });

  const handleInputChange = (field, value) => {
    const newData = { ...data, [field]: value };
    updateUnitNormalizationConfig(id, newData);
  };

  const basicConfig = (
    <div className="space-y-3">
      <InputField
        label="归一化轴"
        tooltip={FIELD_TOOLTIPS.axis}
        required
      >
        <input
          type="number"
          value={config.axis}
          onChange={(e) => handleConfigChange('axis', parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </InputField>
      
      <div className="p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">单位归一化层</h4>
        <p className="text-sm text-gray-700">
          将输入向量归一化为单位长度（L2归一化）
        </p>
      </div>
    </div>
  );

  const advancedConfig = (
    <div className="space-y-3">
      <div className="p-3 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">使用场景</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 特征向量归一化</li>
          <li>• 余弦相似度计算</li>
          <li>• 嵌入向量标准化</li>
        </ul>
      </div>
    </div>
  );

  return (
    <NodeContainer
      title="Unit Normalization"
      type="normalization"
      basicConfig={basicConfig}
      advancedConfig={advancedConfig}
    />
  );
}

export default UnitNormalizationNode; 