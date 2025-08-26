import React, { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import DraggableNode from './DraggableNode';
import mlBackendService from '../../services/mlBackendService';

function GeneratorBar() {
  const [layers, setLayers] = useState({});
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 加载层组件数据
  useEffect(() => {
    const loadLayers = async () => {
      try {
        setLoading(true);
        const response = await mlBackendService.getAllLayers();
        
        if (response.success) {
          setLayers(response.layers.layers);
          setCategories(response.layers.categories);
        } else {
          throw new Error('Failed to load layers');
        }
      } catch (err) {
        console.error('Failed to load layers:', err);
        setError(err.message);
        // 降级到静态配置
        setCategories({
          basic: ['dense', 'conv2d', 'maxpool2d', 'avgpool2d', 'flatten'],
          advanced: ['lstm', 'gru'],
          activation: ['relu', 'sigmoid', 'tanh'],
          regularization: ['dropout', 'batch_normalization'],
          custom: ['reshape']
        });
      } finally {
        setLoading(false);
      }
    };

    loadLayers();
  }, []);

  // 渲染加载状态
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 h-full">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Model Components</h2>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading layers...</span>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="p-4 bg-gray-50 h-full">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Model Components</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">Failed to load layers from backend</p>
          <p className="text-red-600 text-xs mt-1">{error}</p>
          <p className="text-gray-600 text-xs mt-2">Using fallback configuration...</p>
        </div>
      </div>
    );
  }

  // 分类标题映射
  const categoryTitles = {
    basic: 'Basic Layers',
    advanced: 'Advanced Layers', 
    activation: 'Activation Layers',
    normalization: 'Normalization',
    regularization: 'Regularization',
    attention: 'Attention Mechanisms',
    custom: 'Utility Layers'
  };

  return (
    <div className="p-4 bg-gray-50 h-full">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 sticky top-0 bg-gray-50 py-2 z-10">
        Model Components
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Drag and drop components to the canvas
      </p>
      
      <div className="space-y-4 pb-20">
        {/* 数据源分组 */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold sticky top-16 bg-gray-50 py-1">
            Data Sources
          </h3>
          <div className="space-y-2 mt-2">
            <DraggableComponentWrapper 
              key="useData" 
              type="useData" 
              label="CSV / Custom Data"
              layerInfo={null}
            />
            <DraggableComponentWrapper 
              key="mnist" 
              type="mnist" 
              label="MNIST Dataset"
              layerInfo={null}
            />
          </div>
        </div>

        {/* 工具分组 */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold sticky top-16 bg-gray-50 py-1">
            Tools
          </h3>
          <div className="space-y-2 mt-2">
            <DraggableComponentWrapper 
              key="trainButton" 
              type="trainButton" 
              label="Train"
              layerInfo={null}
            />
          </div>
        </div>

        {Object.entries(categories).map(([categoryKey, layerTypes]) => (
          <div key={categoryKey}>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold sticky top-16 bg-gray-50 py-1">
              {categoryTitles[categoryKey] || categoryKey}
            </h3>
            <div className="space-y-2 mt-2">
              {layerTypes.map((layerType) => {
                const layerInfo = layers[layerType];
                // 始终使用英文类型键作为显示名称，避免显示中文描述
                const label = layerType;

                return (
                  <DraggableComponentWrapper 
                    key={layerType} 
                    type={layerType} 
                    label={label}
                    layerInfo={layerInfo}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-700 mb-2">Tips</h3>
        <ul className="text-xs text-blue-600 list-disc pl-4 space-y-1">
          <li>Drag components to the canvas</li>
          <li>Connect nodes with handles</li>
          <li>Click on nodes to edit parameters</li>
          <li>Press Delete to remove components</li>
        </ul>
      </div>
    </div>
  );
}

// 拖拽包装组件
const DraggableComponentWrapper = ({ type, label, layerInfo }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'layer',
    item: { 
      type: 'layer',
      layerType: type, 
      label: label,
      data: layerInfo || {}
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag} 
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="transition-opacity duration-200"
    >
      <DraggableNode 
        type={type} 
        label={label} 
        description={layerInfo?.description}
        frameworks={layerInfo?.supported_frameworks}
      />
    </div>
  );
};

export default GeneratorBar;



