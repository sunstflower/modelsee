import React, { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import DraggableNode from './DraggableNode';
import mlBackendService from '../../services/mlBackendService';
import presetModelService from '../../services/presetModelService';

function GeneratorBar() {
  const [layers, setLayers] = useState({});
  const [categories, setCategories] = useState({});
  const [presetModels, setPresetModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});

  // 切换分类折叠状态
  const toggleSection = (sectionKey) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // 加载层组件数据和预置模型
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 并行加载层数据和预置模型
        const [layersPromise, modelsPromise] = await Promise.allSettled([
          mlBackendService.getAllLayers(),
          presetModelService.getAllModels()
        ]);
        
        // 处理层数据
        if (layersPromise.status === 'fulfilled' && layersPromise.value.success) {
          setLayers(layersPromise.value.layers.layers);
          setCategories(layersPromise.value.layers.categories);
        } else {
          console.warn('Failed to load layers, using fallback');
          setCategories({
            basic: ['dense', 'conv2d', 'maxpool2d', 'avgpool2d', 'flatten'],
            advanced: ['lstm', 'gru'],
            activation: ['relu', 'sigmoid', 'tanh'],
            regularization: ['dropout', 'batch_normalization'],
            custom: ['reshape']
          });
        }
        
        // 处理预置模型数据
        if (modelsPromise.status === 'fulfilled') {
          setPresetModels(modelsPromise.value);
        } else {
          console.warn('Failed to load preset models:', modelsPromise.reason);
          setPresetModels([]);
        }
        
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
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

  // 可折叠分类组件
  const CollapsibleSection = ({ sectionKey, title, children, defaultExpanded = true }) => {
    const isCollapsed = collapsedSections[sectionKey] ?? !defaultExpanded;
    
    return (
      <div>
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center justify-between w-full text-left text-xs uppercase tracking-wider text-gray-500 font-semibold sticky top-16 bg-gray-50 py-1 hover:text-gray-700 transition-colors duration-200"
        >
          <span>{title}</span>
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className={`transition-all duration-300 overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'
        }`}>
          <div className="space-y-2 mt-2">
            {children}
          </div>
        </div>
      </div>
    );
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
        {/* 预置模型分组 */}
        <CollapsibleSection sectionKey="presetModels" title="Models" defaultExpanded={false}>
          {presetModels.length > 0 ? (
            presetModels.map((model) => (
              <PresetModelWrapper 
                key={model.id} 
                model={model}
              />
            ))
          ) : (
            <div className="text-xs text-gray-500 italic py-2">
              No preset models available
            </div>
          )}
        </CollapsibleSection>

        {/* 数据源分组 */}
        <CollapsibleSection sectionKey="dataSources" title="Data Sources" defaultExpanded={false}>
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
        </CollapsibleSection>

        {/* 工具分组 - Train 组件不折叠 */}
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
          <CollapsibleSection 
            key={categoryKey} 
            sectionKey={categoryKey} 
            title={categoryTitles[categoryKey] || categoryKey}
            defaultExpanded={false} // 所有分类默认折叠
          >
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
          </CollapsibleSection>
        ))}
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

// 预置模型拖拽包装组件
const PresetModelWrapper = ({ model }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'presetModel',
    item: { 
      type: 'presetModel',
      modelId: model.id,
      model: model
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
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm text-gray-800">{model.name}</h4>
          <div className="flex items-center space-x-1">
            <span className={`px-2 py-1 text-xs rounded-full ${
              model.complexity === 'simple' ? 'bg-green-100 text-green-700' :
              model.complexity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {model.complexity}
            </span>
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
              {model.framework}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mb-2">{model.description}</p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>📊 {model.category.toUpperCase()}</span>
          <div className="flex items-center space-x-2">
            {model.input_spec?.dataset && (
              <span>📥 {model.input_spec.dataset}</span>
            )}
            {model.ready_to_train && (
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                ⚡ Ready
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratorBar;



