import React from 'react';
import { 
  FaDatabase, 
  FaImage, 
  FaLayerGroup, 
  FaNetworkWired, 
  FaPlay,
  FaTint,
  FaChartBar,
  FaCompress,
  FaExchangeAlt,
  FaRandom,
  FaCode,
  FaExpand,
  FaCog,
  FaBrain,
  FaFilter,
  FaEye,
  FaShapes,
  FaCalculator,
  FaWaveSquare
} from 'react-icons/fa';

const DraggableNode = ({ type, label, description, frameworks }) => {
  const getIcon = () => {
    // 基础层
    if (['dense', 'linear'].includes(type)) return <FaNetworkWired className="text-red-500" />;
    if (['conv2d', 'conv1d', 'conv3d', 'separable_conv2d'].includes(type)) return <FaLayerGroup className="text-green-500" />;
    if (['maxpool2d', 'avgpool2d', 'maxpooling2d', 'avgpooling2d'].includes(type)) return <FaCompress className="text-orange-500" />;
    if (['flatten'].includes(type)) return <FaCompress className="text-gray-500" />;
    
    // 高级层
    if (['lstm', 'gru'].includes(type)) return <FaExchangeAlt className="text-indigo-500" />;
    
    // 激活层
    if (['relu', 'leaky_relu', 'elu', 'prelu', 'sigmoid', 'tanh', 'softmax', 'swish', 'gelu', 'mish'].includes(type)) {
      return <FaWaveSquare className="text-pink-500" />;
    }
    
    // 归一化层
    if (['batch_normalization', 'layer_normalization', 'group_normalization', 'instance_normalization', 'weight_normalization', 'local_response_normalization', 'unit_normalization', 'cosine_normalization'].includes(type)) {
      return <FaChartBar className="text-yellow-500" />;
    }
    
    // 正则化层
    if (['dropout', 'alpha_dropout', 'gaussian_dropout', 'spectral_normalization'].includes(type)) {
      return <FaTint className="text-blue-400" />;
    }
    
    // 注意力机制
    if (['multi_head_attention', 'self_attention', 'additive_attention', 'attention_pooling', 'cross_attention'].includes(type)) {
      return <FaBrain className="text-purple-500" />;
    }
    
    // 自定义层
    if (['reshape', 'permute', 'repeat_vector', 'lambda', 'masking', 'cropping2d', 'zero_padding2d'].includes(type)) {
      return <FaShapes className="text-teal-500" />;
    }
    
    // 数据相关
    if (['useData', 'data'].includes(type)) return <FaDatabase className="text-blue-500" />;
    if (['mnist'].includes(type)) return <FaImage className="text-purple-500" />;
    if (['trainButton', 'train'].includes(type)) return <FaPlay className="text-green-600" />;
    
    return <FaCog className="text-gray-500" />;
  };

  const getBackgroundColor = () => {
    // 基础层
    if (['dense', 'linear'].includes(type)) return 'bg-red-50 hover:bg-red-100 border-red-200';
    if (['conv2d', 'conv1d', 'conv3d', 'separable_conv2d'].includes(type)) return 'bg-green-50 hover:bg-green-100 border-green-200';
    if (['maxpool2d', 'avgpool2d', 'maxpooling2d', 'avgpooling2d'].includes(type)) return 'bg-orange-50 hover:bg-orange-100 border-orange-200';
    if (['flatten'].includes(type)) return 'bg-gray-50 hover:bg-gray-100 border-gray-200';
    
    // 高级层
    if (['lstm', 'gru'].includes(type)) return 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200';
    
    // 激活层
    if (['relu', 'leaky_relu', 'elu', 'prelu', 'sigmoid', 'tanh', 'softmax', 'swish', 'gelu', 'mish'].includes(type)) {
      return 'bg-pink-50 hover:bg-pink-100 border-pink-200';
    }
    
    // 归一化层
    if (['batch_normalization', 'layer_normalization', 'group_normalization', 'instance_normalization', 'weight_normalization', 'local_response_normalization', 'unit_normalization', 'cosine_normalization'].includes(type)) {
      return 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200';
    }
    
    // 正则化层
    if (['dropout', 'alpha_dropout', 'gaussian_dropout', 'spectral_normalization'].includes(type)) {
      return 'bg-blue-50 hover:bg-blue-100 border-blue-200';
    }
    
    // 注意力机制
    if (['multi_head_attention', 'self_attention', 'additive_attention', 'attention_pooling', 'cross_attention'].includes(type)) {
      return 'bg-purple-50 hover:bg-purple-100 border-purple-200';
    }
    
    // 自定义层
    if (['reshape', 'permute', 'repeat_vector', 'lambda', 'masking', 'cropping2d', 'zero_padding2d'].includes(type)) {
      return 'bg-teal-50 hover:bg-teal-100 border-teal-200';
    }
    
    // 数据相关
    if (['useData', 'data'].includes(type)) return 'bg-blue-50 hover:bg-blue-100 border-blue-200';
    if (['mnist'].includes(type)) return 'bg-purple-50 hover:bg-purple-100 border-purple-200';
    if (['trainButton', 'train'].includes(type)) return 'bg-green-50 hover:bg-green-100 border-green-200';
    
    return 'bg-gray-50 hover:bg-gray-100 border-gray-200';
  };

  return (
    <div className={`flex flex-col p-3 rounded-lg cursor-move transition-all duration-200 border ${getBackgroundColor()} shadow-sm hover:shadow-md`}>
      <div className="flex items-center">
        <div className="mr-3 text-xl">
          {getIcon()}
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {frameworks && (
            <div className="flex gap-1 mt-1">
              {frameworks.map(framework => (
                <span 
                  key={framework}
                  className="text-xs px-1.5 py-0.5 bg-white bg-opacity-70 rounded text-gray-600 font-mono"
                >
                  {framework === 'tensorflow' ? 'TF' : framework === 'pytorch' ? 'PT' : framework}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {description && description !== label && (
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

export default DraggableNode;



