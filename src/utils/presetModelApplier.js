/**
 * 预置模型应用器 - 将预置模型配置应用到画布上
 */

/**
 * 将预置模型应用到画布
 * @param {Object} preset - 预置模型配置
 * @param {Object} dropPosition - 拖放位置 {x, y}
 * @param {Function} useStore - Zustand store hook
 * @returns {Object} - 生成的节点和边的信息
 */
export const applyPresetToCanvas = (preset, dropPosition, useStore) => {
  const store = useStore.getState();
  
  // 验证预置模型
  if (!preset || !preset.layers || preset.layers.length === 0) {
    throw new Error('Invalid preset model configuration');
  }

  // 生成唯一前缀，避免ID冲突
  const timestamp = Date.now();
  const prefix = `${preset.id}_${timestamp}`;
  
  // 计算布局参数
  const startX = dropPosition.x || 100;
  const startY = dropPosition.y || 100;
  const nodeWidth = 280;
  const nodeHeight = 200;
  const horizontalSpacing = 320;
  const verticalSpacing = 250;
  const maxNodesPerRow = 4;

  const newNodes = [];
  const nodeConnections = []; // 存储节点连接关系，稍后使用 store.addEdge
  const configUpdates = {};

  // 为每个层生成节点
  preset.layers.forEach((layerSpec, index) => {
    const { type, config = {} } = layerSpec;
    
    // 计算节点位置（网格布局）
    const row = Math.floor(index / maxNodesPerRow);
    const col = index % maxNodesPerRow;
    const x = startX + col * horizontalSpacing;
    const y = startY + row * verticalSpacing;

    // 生成唯一节点ID
    const nodeId = `${prefix}_${type}_${index}`;
    
    // 创建节点
    const node = {
      id: nodeId,
      type: type,
      position: { x, y },
      data: {
        index: store.nodes.length + index, // 配置索引
        sequenceId: store.nodes.length + index,
        presetOrigin: preset.id,
        originalIndex: index
      }
    };

    newNodes.push(node);

    // 准备配置更新（只有需要配置的层类型才更新）
    const configKey = getConfigKey(type);
    if (configKey) {
      if (!configUpdates[configKey]) {
        configUpdates[configKey] = [];
      }
      
      // 合并预置配置和默认配置
      const mergedConfig = {
        ...getDefaultConfig(type),
        ...config,
        extraConfig: config // 将完整配置也放入 extraConfig 以确保所有参数传递
      };
      
      configUpdates[configKey].push(mergedConfig);
    }

    // 记录节点连接关系（连接相邻层）
    if (index > 0) {
      // 获取前一个节点的ID（确保与节点生成逻辑一致）
      const prevNodeId = `${prefix}_${preset.layers[index - 1].type}_${index - 1}`;
      
      nodeConnections.push({
        source: prevNodeId,
        target: nodeId
      });
    }
  });

  // 应用到 store
  applyToStore(store, newNodes, nodeConnections, configUpdates, useStore);

  // 统计模型组件
  const layerCount = newNodes.filter(n => !['mnist', 'useData', 'trainButton'].includes(n.type)).length;
  const hasDataSource = newNodes.some(n => ['mnist', 'useData'].includes(n.type));
  const hasTrainButton = newNodes.some(n => n.type === 'trainButton');
  const dataSourceType = hasDataSource ? newNodes.find(n => ['mnist', 'useData'].includes(n.type)).type : null;

  return {
    nodes: newNodes,
    edges: [], // 边通过 store.addEdge 添加，这里返回空数组
    modelInfo: {
      id: preset.id,
      name: preset.name,
      nodeCount: newNodes.length,
      layerCount: layerCount,
      hasDataSource: hasDataSource,
      dataSourceType: dataSourceType,
      hasTrainButton: hasTrainButton,
      ready: hasDataSource && hasTrainButton && layerCount > 0,
      prefix: prefix
    }
  };
};

/**
 * 获取层类型对应的配置键名
 */
function getConfigKey(layerType) {
  const mapping = {
    'conv2d': 'conv2dConfigs',
    'dense': 'denseConfigs',
    'maxPooling2d': 'maxPooling2dConfigs',
    'avgPooling2d': 'avgPooling2dConfigs',
    'dropout': 'dropoutConfigs',
    'batchNorm': 'batchNormConfigs',
    'flatten': 'flattenConfigs',
    'activation': 'activationConfigs',
    'lstm': 'lstmConfigs',
    'gru': 'gruConfigs',
    'reshape': 'reshapeConfigs',
    // 数据源和工具不需要配置
    'mnist': null,
    'useData': null,
    'trainButton': null
  };
  
  return mapping[layerType];
}

/**
 * 获取层类型的默认配置
 */
function getDefaultConfig(layerType) {
  const defaults = {
    'conv2d': {
      filters: 32,
      kernel_size: [3, 3],
      strides: [1, 1],
      padding: 'valid',
      activation: 'relu',
      use_bias: true,
      kernel_initializer: 'glorot_uniform',
      bias_initializer: 'zeros'
    },
    'dense': {
      units: 128,
      activation: 'relu',
      use_bias: true,
      kernel_initializer: 'glorot_uniform',
      bias_initializer: 'zeros'
    },
    'maxPooling2d': {
      pool_size: [2, 2],
      strides: null,
      padding: 'valid'
    },
    'avgPooling2d': {
      pool_size: [2, 2],
      strides: null,
      padding: 'valid'
    },
    'dropout': {
      rate: 0.5
    },
    'batchNorm': {
      axis: -1,
      momentum: 0.99,
      epsilon: 0.001,
      center: true,
      scale: true
    },
    'flatten': {},
    'activation': {
      activation: 'relu'
    },
    'lstm': {
      units: 128,
      activation: 'tanh',
      recurrent_activation: 'sigmoid',
      return_sequences: false,
      dropout: 0.0,
      recurrent_dropout: 0.0
    },
    'gru': {
      units: 128,
      activation: 'tanh',
      recurrent_activation: 'sigmoid',
      return_sequences: false,
      dropout: 0.0,
      recurrent_dropout: 0.0
    },
    'reshape': {
      targetShape: '(None, 7, 4)',
      inputFeatures: 4
    },
    // 数据源和工具的默认配置
    'mnist': {},
    'useData': {},
    'trainButton': {}
  };
  
  return defaults[layerType] || {};
}

/**
 * 应用更改到 store
 */
function applyToStore(store, newNodes, nodeConnections, configUpdates, useStore) {
  // 批量更新配置
  Object.entries(configUpdates).forEach(([configKey, configs]) => {
    const currentConfigs = store[configKey] || [];
    const updatedConfigs = [...currentConfigs, ...configs];
    
    // 更新对应的配置数组
    useStore.setState(state => ({
      [configKey]: updatedConfigs
    }));
  });

  // 批量添加节点
  useStore.setState(state => ({
    nodes: [...state.nodes, ...newNodes]
  }));

  // 使用 store 的 addEdge 方法添加连接
  nodeConnections.forEach(connection => {
    useStore.getState().addEdge(connection.source, connection.target);
  });
}

/**
 * 清除指定前缀的模型节点
 */
export const clearPresetModel = (prefix, useStore) => {
  useStore.setState(state => ({
    nodes: state.nodes.filter(node => !node.id.startsWith(prefix)),
    edges: state.edges.filter(edge => 
      !edge.source.startsWith(prefix) && !edge.target.startsWith(prefix)
    )
  }));
};

/**
 * 获取画布中心位置
 */
export const getCanvasCenter = () => {
  // 可以根据实际画布大小调整
  return { x: 400, y: 300 };
};
