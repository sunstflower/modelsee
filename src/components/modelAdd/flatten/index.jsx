import React from 'react';
import NodeContainer from '../NodeContainer';

function FlattenNode({ data }) {
  // Flatten层没有可配置参数，但显示信息说明
  const basicConfig = (
    <div className="space-y-3">
      <div className="bg-gray-50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">层功能</h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          将多维输入张量展平为一维向量，保持批次维度不变。常用于卷积层和全连接层之间的过渡。
        </p>
      </div>
      
      <div className="bg-blue-50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-blue-700 mb-2">使用场景</h4>
        <ul className="text-sm text-blue-600 space-y-1">
          <li>• 连接卷积层与全连接层</li>
          <li>• 将特征图转换为向量形式</li>
          <li>• 为分类器准备输入</li>
        </ul>
      </div>
      
      <div className="bg-green-50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-green-700 mb-2">输入输出</h4>
        <div className="text-sm text-green-600 space-y-1">
          <div><strong>输入:</strong> (batch_size, height, width, channels)</div>
          <div><strong>输出:</strong> (batch_size, height × width × channels)</div>
        </div>
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