import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';

/**
 * 公共节点容器组件，为所有模型构建组件提供统一的样式和折叠功能
 * @param {object} props 
 * @param {React.ReactNode} props.children - 子组件内容
 * @param {string} props.title - 节点标题
 * @param {boolean} props.hasInputHandle - 是否显示输入连接点
 * @param {boolean} props.hasOutputHandle - 是否显示输出连接点
 * @param {string} props.inputHandleId - 输入连接点ID
 * @param {string} props.outputHandleId - 输出连接点ID
 * @param {string} props.backgroundColor - 背景颜色
 */
function NodeContainer({ 
  children, 
  title,
  hasInputHandle = true,
  hasOutputHandle = true,
  inputHandleId = null,
  outputHandleId = "a",
  backgroundColor = "white",
  data = {}
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div 
      className={`node-container bg-${backgroundColor} shadow-lg rounded-xl p-4 w-72 transition-all duration-300 border-2 border-gray-200 hover:border-blue-300`}
      style={{
        maxHeight: isCollapsed ? '80px' : '500px', 
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {hasInputHandle && (
        <Handle
          type="target"
          position={Position.Top}
          id={inputHandleId}
          className='w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md hover:bg-blue-600 transition-colors'
          style={{
            top: -8,
            background: '#3b82f6',
          }}
        />
      )}
      
      <div 
        className="flex justify-between items-center mb-3 cursor-pointer select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className="font-bold text-gray-800 text-lg flex items-center">
          <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
          {title}
        </h3>
        <button 
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
      
      <div 
        className={`content-container transition-all duration-300 ${
          isCollapsed ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        style={{
          display: isCollapsed ? 'none' : 'block', 
          maxHeight: '400px', 
          overflowY: 'auto',
        }}
      >
        <div className="space-y-3">
          {children}
        </div>
        
        {/* 删除按钮 */}
        {data.onDelete && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={data.onDelete}
              className="w-full px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
            >
              删除此层
            </button>
          </div>
        )}
      </div>
      
      {hasOutputHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          id={outputHandleId}
          className='w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-md hover:bg-green-600 transition-colors'
          style={{
            bottom: -8,
            background: '#10b981',
          }}
        />
      )}
    </div>
  );
}

export default NodeContainer; 