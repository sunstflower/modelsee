import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  Panel,
  MiniMap,
  ReactFlowProvider,
} from '@xyflow/react';
import { useDrop } from 'react-dnd';
import mlBackendService from '../../services/mlBackendService';
import ModelToolbar from '../ModelToolbar';
import LayerTooltip from '../Tooltip/LayerTooltip';
import { useParams, useNavigate } from 'react-router-dom';

// 导入自定义节点类型
import DenseNode from '../modelAdd/dense';
import Conv2DNode from '../modelAdd/conv2d1';
import FlattenNode from '../modelAdd/flatten';
import DropoutNode from '../modelAdd/dropout';
import BatchNormNode from '../modelAdd/batchNorm';
import MaxPooling2DNode from '../modelAdd/maxPooling2d';
import AvgPooling2DNode from '../modelAdd/avgPooling2d';
import ActivationNode from '../modelAdd/activation';
import LSTMNode from '../modelAdd/lstm';
import GRUNode from '../modelAdd/gru';
import ReshapeNode from '../modelAdd/reshape';

// 增强的样式配置
const rfStyle = {
  backgroundColor: '#f1f5f9',
  width: '100%', 
  height: 'calc(100vh - 120px)',
  backgroundImage: `
    radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0),
    linear-gradient(45deg, rgba(59, 130, 246, 0.05) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(59, 130, 246, 0.05) 25%, transparent 25%)
  `,
  backgroundSize: '20px 20px, 40px 40px, 40px 40px',
};

const edgeOptions = {
  animated: true,
  style: {
    stroke: '#3b82f6',
    strokeWidth: 3,
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
  },
  markerEnd: {
    type: 'arrowclosed',
    color: '#3b82f6',
  },
};

const connectionLineStyle = {
  stroke: '#3b82f6',
  strokeWidth: 3,
  strokeDasharray: '5,5',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
};

// 完整的节点类型映射
const nodeTypes = {
  dense: DenseNode,
  conv2d: Conv2DNode,
  conv2d1: Conv2DNode, // 别名
  flatten: FlattenNode,
  dropout: DropoutNode,
  batch_normalization: BatchNormNode,
  batchNorm: BatchNormNode, // 别名
  maxpool2d: MaxPooling2DNode,
  maxPooling2d: MaxPooling2DNode, // 别名
  avgpool2d: AvgPooling2DNode,
  avgPooling2d: AvgPooling2DNode, // 别名
  activation: ActivationNode,
  lstm: LSTMNode,
  gru: GRUNode,
  reshape: ReshapeNode,
  // 添加更多层类型的映射
  relu: ActivationNode,
  sigmoid: ActivationNode,
  tanh: ActivationNode,
  softmax: ActivationNode,
  leaky_relu: ActivationNode,
  elu: ActivationNode,
  swish: ActivationNode,
  gelu: ActivationNode,
};

// 改进的节点创建函数
const createDefaultNode = (layerType, position, layerData = {}) => {
  // 生成唯一ID
  const nodeId = `${layerType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 根据层类型确定节点类型
  let nodeType = layerType;
  
  // 处理激活函数层
  if (['relu', 'sigmoid', 'tanh', 'softmax', 'leaky_relu', 'elu', 'swish', 'gelu'].includes(layerType)) {
    nodeType = 'activation';
  }
  
  // 处理别名
  const typeMapping = {
    'conv2d1': 'conv2d',
    'batchNorm': 'batch_normalization',
    'maxPooling2d': 'maxpool2d',
    'avgPooling2d': 'avgpool2d',
  };
  
  if (typeMapping[layerType]) {
    nodeType = typeMapping[layerType];
  }

  const baseNode = {
    id: nodeId,
    type: nodeType,
    position: position,
    data: {
      layerType: layerType,
      label: layerType,
      index: Date.now(), // 用于store索引
      parameters: layerData.parameters || {},
      requiredParams: layerData.requiredParams || [],
      constraints: layerData.constraints || {},
      // 如果是激活函数层，设置特定的激活函数
      ...(nodeType === 'activation' && layerType !== 'activation' ? {
        activationType: layerType
      } : {}),
    },
    // 添加自定义样式
    style: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease-in-out',
    },
  };

  return baseNode;
};

// 验证连接是否有效
const isValidConnection = (connection) => {
  // 基本验证：不能连接到自己，不能重复连接
  if (connection.source === connection.target) {
    return false;
  }
  
  // 可以添加更多的连接验证逻辑
  return true;
};

// 主要的Flow编辑器组件
function MLFlowEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const reactFlowWrapper = useRef(null);
  
  // UI状态
  const [tooltipInfo, setTooltipInfo] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [backendStatus, setBackendStatus] = useState('connecting');

  // 初始化
  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const health = await mlBackendService.checkHealth();
      if (health.status === 'healthy') {
        setBackendStatus('connected');
      } else {
        setBackendStatus('error');
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
      setBackendStatus('error');
    }
  };

  // 节点变化处理
  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  // 边变化处理
  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // 连接处理
  const onConnect = useCallback((connection) => {
    if (isValidConnection(connection)) {
      setEdges((eds) => addEdge({
        ...connection,
        ...edgeOptions,
        id: `edge_${connection.source}_${connection.target}_${Date.now()}`,
      }, eds));
    }
  }, []);

  // 节点拖拽结束处理
  const onNodeDragStop = useCallback((event, node) => {
    console.log('Node dragged:', node);
  }, []);

  // 参数更新处理
  const handleParameterChange = useCallback((nodeId, paramName, paramValue) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              parameters: {
                ...node.data.parameters,
                [paramName]: paramValue,
              },
            },
          };
        }
        return node;
      })
    );
  }, []);

  // 删除节点
  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
  }, []);

  // 改进的拖放处理
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'layer',
    drop: (item, monitor) => {
      console.log('Dropped item:', item);
      
      const clientOffset = monitor.getClientOffset();
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      
      if (reactFlowInstance && clientOffset && reactFlowBounds) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: clientOffset.x - reactFlowBounds.left,
          y: clientOffset.y - reactFlowBounds.top,
        });

        // 创建新节点
        const newNode = createDefaultNode(
          item.layerType || item.type, 
          position, 
          item.data || {}
        );
        
        // 设置参数更新回调
        newNode.data.onParameterChange = (paramName, paramValue) => {
          handleParameterChange(newNode.id, paramName, paramValue);
        };
        
        // 设置删除回调
        newNode.data.onDelete = () => {
          deleteNode(newNode.id);
        };

        console.log('Creating node:', newNode);
        setNodes((nds) => [...nds, newNode]);
        
        // 显示成功提示
        console.log(`成功添加 ${item.layerType || item.type} 层`);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [reactFlowInstance, handleParameterChange, deleteNode]);

  // 节点选择处理
  const onNodeClick = useCallback((event, node) => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id,
        style: {
          ...n.style,
          border: n.id === node.id ? '2px solid #3b82f6' : '2px solid #e2e8f0',
          boxShadow: n.id === node.id 
            ? '0 0 0 3px rgba(59, 130, 246, 0.1)' 
            : '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      }))
    );
  }, []);

  // 节点悬停处理
  const onNodeMouseEnter = useCallback((event, node) => {
    // 更新节点样式
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: {
          ...n.style,
          transform: n.id === node.id ? 'scale(1.02)' : 'scale(1)',
          zIndex: n.id === node.id ? 1000 : 1,
        },
      }))
    );
  }, []);

  const onNodeMouseLeave = useCallback((event, node) => {
    // 恢复节点样式
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: {
          ...n.style,
          transform: 'scale(1)',
          zIndex: 1,
        },
      }))
    );
  }, []);

  // 会话创建回调
  const handleSessionCreated = useCallback((sessionId) => {
    setSessionId(sessionId);
    console.log('Session created:', sessionId);
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // 删除选中的节点
        setNodes((nds) => nds.filter((node) => !node.selected));
        setEdges((eds) => eds.filter((edge) => !edge.selected));
      }
      
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 's') {
          event.preventDefault();
          console.log('Save project');
        }
        
        if (event.key === 'z') {
          event.preventDefault();
          console.log('Undo');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      {/* 工具栏 */}
      <ModelToolbar 
        nodes={nodes} 
        edges={edges} 
        onSessionCreated={handleSessionCreated}
      />
      
      {/* 主要编辑区域 */}
      <div 
        ref={reactFlowWrapper}
        className="flex-1 relative"
        style={{ 
          backgroundColor: isOver ? '#dbeafe' : '#f1f5f9',
          transition: 'background-color 0.3s ease',
          border: isOver ? '2px dashed #3b82f6' : '2px solid transparent',
        }}
      >
        <div ref={drop} className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            connectionLineStyle={connectionLineStyle}
            defaultEdgeOptions={edgeOptions}
            style={rfStyle}
            fitView
            attributionPosition="bottom-left"
            snapToGrid={true}
            snapGrid={[20, 20]}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
          >
            <Background 
              color="#cbd5e1" 
              gap={20} 
              size={1}
              style={{
                background: 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 100%)',
              }}
            />
            <Controls 
              position="top-left"
              className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg"
              style={{
                button: {
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  margin: '2px',
                },
              }}
            />
            <MiniMap 
              position="bottom-right"
              className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg"
              nodeColor="#3b82f6"
              maskColor="rgba(59, 130, 246, 0.1)"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              }}
            />
            
            {/* 增强的状态面板 */}
            <Panel position="top-right" className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4">
              <div className="text-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">后端状态:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    backendStatus === 'connected' ? 'bg-green-100 text-green-800' :
                    backendStatus === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {backendStatus === 'connected' ? '✓ 已连接' :
                     backendStatus === 'error' ? '✗ 连接失败' : '⟳ 连接中...'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">节点数量:</span>
                  <span className="font-bold text-blue-600">{nodes.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">连接数量:</span>
                  <span className="font-bold text-green-600">{edges.length}</span>
                </div>
                
                {sessionId && (
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                    <span className="font-medium">会话ID:</span> {sessionId.substring(0, 8)}...
                  </div>
                )}
              </div>
            </Panel>

            {/* 增强的拖放提示 */}
            {isOver && (
              <Panel position="top-center" className="bg-blue-50/90 backdrop-blur-sm border-2 border-blue-200 rounded-xl p-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="text-blue-800 text-sm font-medium">
                    松开鼠标以添加层组件到画布
                  </div>
                </div>
              </Panel>
            )}

            {/* 空状态提示 */}
            {nodes.length === 0 && !isOver && (
              <Panel position="center" className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200">
                <div className="text-center">
                  <div className="text-4xl mb-4">🎨</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">开始构建您的模型</h3>
                  <p className="text-gray-600 text-sm">
                    从左侧拖拽层组件到此处开始构建您的神经网络模型
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>
      
      {/* 工具提示 */}
      {showTooltip && tooltipInfo && (
        <LayerTooltip 
          info={tooltipInfo}
          onClose={() => setShowTooltip(false)}
        />
      )}
    </div>
  );
}

// 包装组件提供React Flow Provider
function MLFlowEditorWithProvider() {
  return (
    <ReactFlowProvider>
      <MLFlowEditor />
    </ReactFlowProvider>
  );
}

export default MLFlowEditorWithProvider; 