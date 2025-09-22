import React from 'react';
import NodeContainer from '../NodeContainer';

function FlattenNode({ data }) {
  // Flatten层没有可配置参数，但显示信息说明
  const basicConfig = (
    <div className="space-y-3">
      <div className="bg-gray-50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">层功能</h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          将多维输入张量展平为一维向量
        </p>
      </div>
    </div>
  );

  return (
    <NodeContainer 
      title="Flatten Layer" 
      backgroundColor="white"
      borderColor="gray-200"
      basicConfig={basicConfig}
    />
  );
}

export default FlattenNode; 