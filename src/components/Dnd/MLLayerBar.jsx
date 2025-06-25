import React, { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import mlBackendService from '../../services/mlBackendService';
import { 
  Layers, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  Info,
  Zap,
  Box,
  Target,
  Filter,
  Cpu,
  Database
} from 'lucide-react';

// 层类型图标映射
const categoryIcons = {
  basic: Box,
  advanced: Cpu,
  activation: Zap,
  regularization: Filter,
  attention: Target,
  normalization: Settings,
  custom: Database
};

// 拖拽层组件
const DraggableLayer = ({ layer, onInfo }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'layer',
    item: { 
      type: 'layer',
      layerType: layer.type,
      label: layer.type,
      data: {
        layerType: layer.type,
        parameters: layer.parameters?.optional || {},
        requiredParams: layer.parameters?.required || [],
        constraints: layer.parameters?.constraints || {}
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [layer]);

  return (
    <div
      ref={drag}
      className={`
        flex items-center justify-between p-3 mb-2 bg-white rounded-lg border 
        cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md 
        transition-all duration-200 group
        ${isDragging ? 'opacity-50 shadow-lg scale-105' : ''}
      `}
    >
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <Layers className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <div className="font-medium text-gray-900 text-sm">{layer.type}</div>
          <div className="text-xs text-gray-500 truncate max-w-32">
            {layer.description}
          </div>
        </div>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onInfo(layer);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-100 transition-opacity"
      >
        <Info className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
};

// 层分类组件
const LayerCategory = ({ category, layers, isExpanded, onToggle, onLayerInfo }) => {
  const IconComponent = categoryIcons[category] || Box;
  
  return (
    <div className="mb-4">
      <button
        onClick={() => onToggle(category)}
        className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="flex items-center space-x-2">
          <IconComponent className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-800 capitalize">
            {category} ({Array.isArray(layers) ? layers.length : 0})
          </span>
        </div>
        {isExpanded ? 
          <ChevronDown className="w-4 h-4 text-gray-400" /> : 
          <ChevronRight className="w-4 h-4 text-gray-400" />
        }
      </button>
      
              {isExpanded && (
          <div className="mt-2 pl-2">
            {layers.map((layer, index) => (
              <DraggableLayer 
                key={`${category}-${layer.type || layer}-${index}`}
                layer={typeof layer === 'string' ? { type: layer, description: '暂无描述' } : layer}
                onInfo={onLayerInfo}
              />
            ))}
          </div>
        )}
    </div>
  );
};

// 层信息模态框
const LayerInfoModal = ({ layer, isOpen, onClose }) => {
  if (!isOpen || !layer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{layer.type}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">描述</h3>
              <p className="text-gray-600">{layer.description}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">支持的框架</h3>
              <div className="flex space-x-2">
                {layer.supported_frameworks?.map(framework => (
                  <span key={framework} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {framework}
                  </span>
                ))}
              </div>
            </div>
            
            {layer.parameters?.required?.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">必需参数</h3>
                <div className="space-y-1">
                  {layer.parameters.required.map(param => (
                    <div key={param} className="px-2 py-1 bg-red-50 text-red-800 rounded text-sm">
                      {param}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {Object.keys(layer.parameters?.optional || {}).length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">可选参数</h3>
                <div className="space-y-2">
                  {Object.entries(layer.parameters.optional).map(([param, defaultValue]) => (
                    <div key={param} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{param}</span>
                      <span className="text-gray-600 text-sm">
                        默认: {JSON.stringify(defaultValue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {Object.keys(layer.parameters?.constraints || {}).length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">参数约束</h3>
                <div className="space-y-2">
                  {Object.entries(layer.parameters.constraints).map(([param, constraint]) => (
                    <div key={param} className="p-2 bg-yellow-50 rounded">
                      <div className="font-medium text-yellow-800">{param}</div>
                      <div className="text-yellow-700 text-sm">
                        {constraint.type === 'range' && `范围: ${constraint.min} - ${constraint.max}`}
                        {constraint.type === 'choices' && `选项: ${constraint.values?.join(', ')}`}
                        {constraint.type === 'type' && `类型: ${constraint.value}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 主组件
const MLLayerBar = () => {
  const [layersData, setLayersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({
    basic: true,
    advanced: false,
    activation: false,
    regularization: false,
    attention: false,
    normalization: false,
    custom: false
  });
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [showLayerInfo, setShowLayerInfo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLayers();
  }, []);

  const loadLayers = async () => {
    try {
      setLoading(true);
      const response = await mlBackendService.getAllLayers();
      
      if (response.success) {
        setLayersData(response.layers);
      } else {
        throw new Error('Failed to load layers');
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to load layers:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleLayerInfo = async (layer) => {
    try {
      const response = await mlBackendService.getLayerInfo(layer.type);
      if (response.success) {
        setSelectedLayer(response.layer_info);
        setShowLayerInfo(true);
      }
    } catch (err) {
      console.error('Failed to get layer info:', err);
    }
  };

  const filteredCategories = layersData ? Object.entries(layersData.categories).filter(([category, layers]) => {
    if (!searchTerm) return true;
    return layers.some(layerType => 
      layerType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) : [];

  if (loading) {
    return (
      <div className="w-64 h-full bg-gray-50 border-r border-gray-200 p-4">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-64 h-full bg-gray-50 border-r border-gray-200 p-4">
        <div className="text-center text-red-600 p-4">
          <p className="mb-2">加载层组件失败</p>
          <button 
            onClick={loadLayers}
            className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-64 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">ML 层组件</h2>
          
          {/* 搜索框 */}
          <input
            type="text"
            placeholder="搜索层..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 层分类列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredCategories.map(([category, layerTypes]) => {
            const categoryLayers = layerTypes.map(layerType => 
              layersData.layers[layerType] || { type: layerType, description: '暂无描述' }
            );
            
            return (
              <LayerCategory
                key={category}
                category={category}
                layers={categoryLayers}
                isExpanded={expandedCategories[category]}
                onToggle={toggleCategory}
                onLayerInfo={handleLayerInfo}
              />
            );
          })}
        </div>

        {/* 底部状态 */}
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          共 {layersData ? Object.keys(layersData.layers).length : 0} 个层组件
        </div>
      </div>

      {/* 层信息模态框 */}
      <LayerInfoModal
        layer={selectedLayer}
        isOpen={showLayerInfo}
        onClose={() => setShowLayerInfo(false)}
      />
    </>
  );
};

export default MLLayerBar; 