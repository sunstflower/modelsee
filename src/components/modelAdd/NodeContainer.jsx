import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';

/**
 * 公共节点容器组件，为所有模型构建组件提供统一的样式和折叠功能
 * @param {object} props 
 * @param {React.ReactNode} props.children - 子组件内容
 * @param {React.ReactNode} props.basicConfig - 基本配置项（始终显示）
 * @param {React.ReactNode} props.advancedConfig - 高级配置项（需要展开显示）
 * @param {string} props.title - 节点标题
 * @param {boolean} props.hasInputHandle - 是否显示输入连接点
 * @param {boolean} props.hasOutputHandle - 是否显示输出连接点
 * @param {string} props.inputHandleId - 输入连接点ID
 * @param {string} props.outputHandleId - 输出连接点ID
 * @param {string} props.backgroundColor - 背景颜色
 * @param {string} props.borderColor - 边框颜色
 */
function NodeContainer({ 
  children,
  basicConfig,
  advancedConfig,
  title,
  hasInputHandle = true,
  hasOutputHandle = true,
  inputHandleId = null,
  outputHandleId = "a",
  backgroundColor = "white",
  borderColor = "gray-200"
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 如果使用了新的basicConfig/advancedConfig模式
  const useNewLayout = basicConfig || advancedConfig;

  return (
    <div className={`node-container bg-${backgroundColor} shadow-lg rounded-lg p-4 w-72 transition-all duration-300 border border-${borderColor} hover:shadow-xl`}>
      {hasInputHandle && (
        <Handle
          type="target"
          position={Position.Top}
          id={inputHandleId}
          className='w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md hover:bg-blue-600 transition-colors'
        />
      )}
      
      {/* 标题栏 */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
        {(advancedConfig || (!useNewLayout && children)) && (
          <button 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "收起高级配置" : "展开高级配置"}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      
      {/* 内容区域 */}
      <div className="space-y-4">
        {useNewLayout ? (
          <>
            {/* 基本配置项 - 始终显示 */}
            {basicConfig && (
              <div className="basic-config">
                {basicConfig}
              </div>
            )}
            
            {/* 高级配置项 - 需要展开 */}
            {advancedConfig && (
              <div className={`advanced-config transition-all duration-300 overflow-hidden ${
                isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="pt-3 border-t border-gray-200">
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">高级配置</span>
                  </div>
                  {advancedConfig}
                </div>
              </div>
            )}
          </>
        ) : (
          /* 兼容旧版本 */
          <div className={`content-container transition-all duration-300 ${
            isExpanded ? 'max-h-96 opacity-100' : 'max-h-32 opacity-100'
          } overflow-hidden`}>
            {children}
          </div>
        )}
      </div>
      
      {hasOutputHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          id={outputHandleId}
          className='w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md hover:bg-green-600 transition-colors'
        />
      )}
    </div>
  );
}

export default NodeContainer; 