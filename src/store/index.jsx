import { create } from 'zustand';

const useStore = create((set) => ({
  isData: false,
  changeData: (data) => set(() => ({ isData: true, csvData: data })),

  csvData: [],
  addCsvData: (config) => set((state) => ({
    csvData: [...state.csvData, config]
  })),

  // 基础层配置
  conv2dConfigs: [
    {
      kernelSize: 5,
      filters: 8,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    },
    {
      kernelSize: 5,
      filters: 16,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    }
  ],
  addConv2dConfig: () => set((state) => ({
    conv2dConfigs: [...state.conv2dConfigs, {
      kernelSize: 5,
      filters: 8,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling',
    }]
  })),
  updateConv2dConfig: (index, config) => set((state) => ({
    conv2dConfigs: state.conv2dConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeConv2dConfig: (index) => set((state) => ({
    conv2dConfigs: state.conv2dConfigs.filter((_, i) => i !== index)
  })),

  maxPooling2dConfigs: [
    {
      poolSize: [3, 3],
      strides: [3, 3],
    },
    {
      poolSize: [2, 2],
      strides: [2, 2],
    }
  ],
  addMaxPooling2dConfig: () => set((state) => ({
    maxPooling2dConfigs: [...state.maxPooling2dConfigs, {
      poolSize: [3, 3],
      strides: [3, 3],
    }]
  })),
  updateMaxPooling2dConfig: (index, config) => set((state) => ({
    maxPooling2dConfigs: state.maxPooling2dConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeMaxPooling2dConfig: (index) => set((state) => ({
    maxPooling2dConfigs: state.maxPooling2dConfigs.filter((_, i) => i !== index)
  })),

  denseConfigs: [{
    units: 10,
    kernelInitializer: 'varianceScaling',
    activation: 'softmax'
  }],
  addDenseConfig: () => set((state) => ({
    denseConfigs: [...state.denseConfigs, {
      units: 128,
      kernelInitializer: 'varianceScaling',
      activation: 'relu'
    }]
  })),
  updateDenseConfig: (index, config) => set((state) => ({
    denseConfigs: state.denseConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeDenseConfig: (index) => set((state) => ({
    denseConfigs: state.denseConfigs.filter((_, i) => i !== index)
  })),

  // 其他基础层
  dropoutConfigs: [],
  addDropoutConfig: () => set((state) => ({
    dropoutConfigs: [...state.dropoutConfigs, { rate: 0.2 }]
  })),
  updateDropoutConfig: (index, config) => set((state) => ({
    dropoutConfigs: state.dropoutConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeDropoutConfig: (index) => set((state) => ({
    dropoutConfigs: state.dropoutConfigs.filter((_, i) => i !== index)
  })),

  batchNormConfigs: [],
  addBatchNormConfig: () => set((state) => ({
    batchNormConfigs: [...state.batchNormConfigs, {
      axis: -1,
      momentum: 0.99,
      epsilon: 0.001,
      center: true,
      scale: true,
    }]
  })),
  updateBatchNormConfig: (index, config) => set((state) => ({
    batchNormConfigs: state.batchNormConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeBatchNormConfig: (index) => set((state) => ({
    batchNormConfigs: state.batchNormConfigs.filter((_, i) => i !== index)
  })),

  flattenConfigs: [],
  addFlattenConfig: () => set((state) => ({
    flattenConfigs: [...state.flattenConfigs, {}]
  })),
  removeFlattenConfig: (index) => set((state) => ({
    flattenConfigs: state.flattenConfigs.filter((_, i) => i !== index)
  })),

  // 高级层
  lstmConfigs: [],
  addLstmConfig: () => set((state) => ({
    lstmConfigs: [...state.lstmConfigs, {
      units: 128,
      activation: 'tanh',
      recurrentActivation: 'sigmoid',
      returnSequences: false,
      goBackwards: false,
      dropout: 0.0,
      recurrentDropout: 0.0,
    }]
  })),
  updateLstmConfig: (index, config) => set((state) => ({
    lstmConfigs: state.lstmConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeLstmConfig: (index) => set((state) => ({
    lstmConfigs: state.lstmConfigs.filter((_, i) => i !== index)
  })),

  gruConfigs: [],
  addGruConfig: () => set((state) => ({
    gruConfigs: [...state.gruConfigs, {
      units: 128,
      activation: 'tanh',
      recurrentActivation: 'sigmoid',
      returnSequences: false,
      dropout: 0.0,
      recurrentDropout: 0.0,
    }]
  })),
  updateGruConfig: (index, config) => set((state) => ({
    gruConfigs: state.gruConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeGruConfig: (index) => set((state) => ({
    gruConfigs: state.gruConfigs.filter((_, i) => i !== index)
  })),

  activationConfigs: [],
  addActivationConfig: () => set((state) => ({
    activationConfigs: [...state.activationConfigs, { activation: 'relu' }]
  })),
  updateActivationConfig: (index, config) => set((state) => ({
    activationConfigs: state.activationConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeActivationConfig: (index) => set((state) => ({
    activationConfigs: state.activationConfigs.filter((_, i) => i !== index)
  })),

  reshapeConfigs: [],
  addReshapeConfig: () => set((state) => ({
    reshapeConfigs: [...state.reshapeConfigs, {
      targetShape: '(None, 7, 4)',
      inputFeatures: 4
    }]
  })),
  updateReshapeConfig: (index, config) => set((state) => ({
    reshapeConfigs: state.reshapeConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeReshapeConfig: (index) => set((state) => ({
    reshapeConfigs: state.reshapeConfigs.filter((_, i) => i !== index)
  })),

  avgPooling2dConfigs: [],
  addAvgPooling2dConfig: () => set((state) => ({
    avgPooling2dConfigs: [...state.avgPooling2dConfigs, {
      poolSize: '(2, 2)',
      strides: '(2, 2)',
      padding: 'valid',
    }]
  })),
  updateAvgPooling2dConfig: (index, config) => set((state) => ({
    avgPooling2dConfigs: state.avgPooling2dConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeAvgPooling2dConfig: (index) => set((state) => ({
    avgPooling2dConfigs: state.avgPooling2dConfigs.filter((_, i) => i !== index)
  })),

  // 新增层配置
  conv1dConfigs: [],
  addConv1dConfig: () => set((state) => ({
    conv1dConfigs: [...state.conv1dConfigs, {
      filters: 32,
      kernel_size: 3,
      strides: 1,
      padding: 'valid',
      activation: 'linear',
      use_bias: true,
    }]
  })),
  updateConv1dConfig: (index, config) => set((state) => ({
    conv1dConfigs: state.conv1dConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeConv1dConfig: (index) => set((state) => ({
    conv1dConfigs: state.conv1dConfigs.filter((_, i) => i !== index)
  })),

  conv3dConfigs: [],
  addConv3dConfig: () => set((state) => ({
    conv3dConfigs: [...state.conv3dConfigs, {
      filters: 32,
      kernel_size: [3, 3, 3],
      strides: [1, 1, 1],
      padding: 'valid',
      activation: 'linear',
      use_bias: true,
    }]
  })),
  updateConv3dConfig: (index, config) => set((state) => ({
    conv3dConfigs: state.conv3dConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeConv3dConfig: (index) => set((state) => ({
    conv3dConfigs: state.conv3dConfigs.filter((_, i) => i !== index)
  })),

  separableConv2dConfigs: [],
  addSeparableConv2dConfig: () => set((state) => ({
    separableConv2dConfigs: [...state.separableConv2dConfigs, {
      filters: 32,
      kernel_size: [3, 3],
      strides: [1, 1],
      padding: 'valid',
      activation: 'linear',
      use_bias: true,
      depth_multiplier: 1,
    }]
  })),
  updateSeparableConv2dConfig: (index, config) => set((state) => ({
    separableConv2dConfigs: state.separableConv2dConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeSeparableConv2dConfig: (index) => set((state) => ({
    separableConv2dConfigs: state.separableConv2dConfigs.filter((_, i) => i !== index)
  })),

  layerNormalizationConfigs: [],
  addLayerNormalizationConfig: () => set((state) => ({
    layerNormalizationConfigs: [...state.layerNormalizationConfigs, {
      axis: -1,
      epsilon: 0.001,
      center: true,
      scale: true,
    }]
  })),
  updateLayerNormalizationConfig: (index, config) => set((state) => ({
    layerNormalizationConfigs: state.layerNormalizationConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeLayerNormalizationConfig: (index) => set((state) => ({
    layerNormalizationConfigs: state.layerNormalizationConfigs.filter((_, i) => i !== index)
  })),

  instanceNormalizationConfigs: [],
  addInstanceNormalizationConfig: () => set((state) => ({
    instanceNormalizationConfigs: [...state.instanceNormalizationConfigs, {
      axis: -1,
      epsilon: 0.001,
      center: true,
      scale: true,
      beta_initializer: 'zeros',
      gamma_initializer: 'ones',
    }]
  })),
  updateInstanceNormalizationConfig: (index, config) => set((state) => ({
    instanceNormalizationConfigs: state.instanceNormalizationConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeInstanceNormalizationConfig: (index) => set((state) => ({
    instanceNormalizationConfigs: state.instanceNormalizationConfigs.filter((_, i) => i !== index)
  })),

  groupNormalizationConfigs: [],
  addGroupNormalizationConfig: () => set((state) => ({
    groupNormalizationConfigs: [...state.groupNormalizationConfigs, {
      groups: 32,
      axis: -1,
      epsilon: 0.001,
      center: true,
      scale: true,
      beta_initializer: 'zeros',
      gamma_initializer: 'ones',
    }]
  })),
  updateGroupNormalizationConfig: (index, config) => set((state) => ({
    groupNormalizationConfigs: state.groupNormalizationConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeGroupNormalizationConfig: (index) => set((state) => ({
    groupNormalizationConfigs: state.groupNormalizationConfigs.filter((_, i) => i !== index)
  })),

  cosineNormalizationConfigs: [],
  addCosineNormalizationConfig: () => set((state) => ({
    cosineNormalizationConfigs: [...state.cosineNormalizationConfigs, {
      axis: -1,
      epsilon: 1e-12,
    }]
  })),
  updateCosineNormalizationConfig: (index, config) => set((state) => ({
    cosineNormalizationConfigs: state.cosineNormalizationConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeCosineNormalizationConfig: (index) => set((state) => ({
    cosineNormalizationConfigs: state.cosineNormalizationConfigs.filter((_, i) => i !== index)
  })),

  unitNormalizationConfigs: [],
  addUnitNormalizationConfig: () => set((state) => ({
    unitNormalizationConfigs: [...state.unitNormalizationConfigs, {
      axis: -1,
    }]
  })),
  updateUnitNormalizationConfig: (index, config) => set((state) => ({
    unitNormalizationConfigs: state.unitNormalizationConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeUnitNormalizationConfig: (index) => set((state) => ({
    unitNormalizationConfigs: state.unitNormalizationConfigs.filter((_, i) => i !== index)
  })),

  localResponseNormalizationConfigs: [],
  addLocalResponseNormalizationConfig: () => set((state) => ({
    localResponseNormalizationConfigs: [...state.localResponseNormalizationConfigs, {
      depth_radius: 5,
      bias: 1.0,
      alpha: 0.0001,
      beta: 0.75,
    }]
  })),
  updateLocalResponseNormalizationConfig: (index, config) => set((state) => ({
    localResponseNormalizationConfigs: state.localResponseNormalizationConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeLocalResponseNormalizationConfig: (index) => set((state) => ({
    localResponseNormalizationConfigs: state.localResponseNormalizationConfigs.filter((_, i) => i !== index)
  })),

  weightNormalizationConfigs: [],
  addWeightNormalizationConfig: () => set((state) => ({
    weightNormalizationConfigs: [...state.weightNormalizationConfigs, {
      dim: 0,
    }]
  })),
  updateWeightNormalizationConfig: (index, config) => set((state) => ({
    weightNormalizationConfigs: state.weightNormalizationConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeWeightNormalizationConfig: (index) => set((state) => ({
    weightNormalizationConfigs: state.weightNormalizationConfigs.filter((_, i) => i !== index)
  })),

  spectralNormalizationConfigs: [],
  addSpectralNormalizationConfig: () => set((state) => ({
    spectralNormalizationConfigs: [...state.spectralNormalizationConfigs, {
      power_iterations: 1,
    }]
  })),
  updateSpectralNormalizationConfig: (index, config) => set((state) => ({
    spectralNormalizationConfigs: state.spectralNormalizationConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeSpectralNormalizationConfig: (index) => set((state) => ({
    spectralNormalizationConfigs: state.spectralNormalizationConfigs.filter((_, i) => i !== index)
  })),

  additiveAttentionConfigs: [],
  addAdditiveAttentionConfig: () => set((state) => ({
    additiveAttentionConfigs: [...state.additiveAttentionConfigs, {
      units: 64,
      activation: 'tanh',
      use_scale: false,
      use_bias: true,
      dropout: 0.0,
    }]
  })),
  updateAdditiveAttentionConfig: (index, config) => set((state) => ({
    additiveAttentionConfigs: state.additiveAttentionConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeAdditiveAttentionConfig: (index) => set((state) => ({
    additiveAttentionConfigs: state.additiveAttentionConfigs.filter((_, i) => i !== index)
  })),

  crossAttentionConfigs: [],
  addCrossAttentionConfig: () => set((state) => ({
    crossAttentionConfigs: [...state.crossAttentionConfigs, {
      units: 64,
      activation: 'tanh',
      use_bias: true,
      dropout: 0.0,
      temperature: 1.0,
    }]
  })),
  updateCrossAttentionConfig: (index, config) => set((state) => ({
    crossAttentionConfigs: state.crossAttentionConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeCrossAttentionConfig: (index) => set((state) => ({
    crossAttentionConfigs: state.crossAttentionConfigs.filter((_, i) => i !== index)
  })),

  attentionPoolingConfigs: [],
  addAttentionPoolingConfig: () => set((state) => ({
    attentionPoolingConfigs: [...state.attentionPoolingConfigs, {
      pool_size: 2,
      activation: 'tanh',
      use_bias: true,
      dropout: 0.0,
      temperature: 1.0,
    }]
  })),
  updateAttentionPoolingConfig: (index, config) => set((state) => ({
    attentionPoolingConfigs: state.attentionPoolingConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeAttentionPoolingConfig: (index) => set((state) => ({
    attentionPoolingConfigs: state.attentionPoolingConfigs.filter((_, i) => i !== index)
  })),

  selfAttentionConfigs: [],
  addSelfAttentionConfig: () => set((state) => ({
    selfAttentionConfigs: [...state.selfAttentionConfigs, {
      units: 64,
      activation: 'tanh',
      use_scale: true,
      use_bias: true,
      dropout: 0.0,
    }]
  })),
  updateSelfAttentionConfig: (index, config) => set((state) => ({
    selfAttentionConfigs: state.selfAttentionConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeSelfAttentionConfig: (index) => set((state) => ({
    selfAttentionConfigs: state.selfAttentionConfigs.filter((_, i) => i !== index)
  })),

  alphaDropoutConfigs: [],
  addAlphaDropoutConfig: () => set((state) => ({
    alphaDropoutConfigs: [...state.alphaDropoutConfigs, { rate: 0.1 }]
  })),
  updateAlphaDropoutConfig: (index, config) => set((state) => ({
    alphaDropoutConfigs: state.alphaDropoutConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeAlphaDropoutConfig: (index) => set((state) => ({
    alphaDropoutConfigs: state.alphaDropoutConfigs.filter((_, i) => i !== index)
  })),

  gaussianDropoutConfigs: [],
  addGaussianDropoutConfig: () => set((state) => ({
    gaussianDropoutConfigs: [...state.gaussianDropoutConfigs, { rate: 0.1 }]
  })),
  updateGaussianDropoutConfig: (index, config) => set((state) => ({
    gaussianDropoutConfigs: state.gaussianDropoutConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeGaussianDropoutConfig: (index) => set((state) => ({
    gaussianDropoutConfigs: state.gaussianDropoutConfigs.filter((_, i) => i !== index)
  })),

  // 通用配置，为其他新层提供基础状态管理
  genericLayerConfigs: {},
  updateGenericLayerConfig: (layerType, index, config) => set((state) => ({
    genericLayerConfigs: {
      ...state.genericLayerConfigs,
      [layerType]: {
        ...state.genericLayerConfigs[layerType],
        [index]: { ...state.genericLayerConfigs[layerType]?.[index], ...config }
      }
    }
  })),

  // 添加所有缺失的层配置
  permuteConfigs: [],
  addPermuteConfig: () => set((state) => ({
    permuteConfigs: [...state.permuteConfigs, { dims: [2, 1] }]
  })),
  updatePermuteConfig: (index, config) => set((state) => ({
    permuteConfigs: state.permuteConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removePermuteConfig: (index) => set((state) => ({
    permuteConfigs: state.permuteConfigs.filter((_, i) => i !== index)
  })),

  maskingConfigs: [],
  addMaskingConfig: () => set((state) => ({
    maskingConfigs: [...state.maskingConfigs, { mask_value: 0.0 }]
  })),
  updateMaskingConfig: (index, config) => set((state) => ({
    maskingConfigs: state.maskingConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeMaskingConfig: (index) => set((state) => ({
    maskingConfigs: state.maskingConfigs.filter((_, i) => i !== index)
  })),

  cropping2dConfigs: [],
  addCropping2dConfig: () => set((state) => ({
    cropping2dConfigs: [...state.cropping2dConfigs, { 
      cropping: [[1, 1], [1, 1]], 
      data_format: null 
    }]
  })),
  updateCropping2dConfig: (index, config) => set((state) => ({
    cropping2dConfigs: state.cropping2dConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeCropping2dConfig: (index) => set((state) => ({
    cropping2dConfigs: state.cropping2dConfigs.filter((_, i) => i !== index)
  })),

  zeroPadding2dConfigs: [],
  addZeroPadding2dConfig: () => set((state) => ({
    zeroPadding2dConfigs: [...state.zeroPadding2dConfigs, { 
      padding: [[1, 1], [1, 1]], 
      data_format: null 
    }]
  })),
  updateZeroPadding2dConfig: (index, config) => set((state) => ({
    zeroPadding2dConfigs: state.zeroPadding2dConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeZeroPadding2dConfig: (index) => set((state) => ({
    zeroPadding2dConfigs: state.zeroPadding2dConfigs.filter((_, i) => i !== index)
  })),

  multiHeadAttentionConfigs: [],
  addMultiHeadAttentionConfig: () => set((state) => ({
    multiHeadAttentionConfigs: [...state.multiHeadAttentionConfigs, {
      num_heads: 8,
      key_dim: 64,
      value_dim: null,
      dropout: 0.0,
      use_bias: true,
    }]
  })),
  updateMultiHeadAttentionConfig: (index, config) => set((state) => ({
    multiHeadAttentionConfigs: state.multiHeadAttentionConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeMultiHeadAttentionConfig: (index) => set((state) => ({
    multiHeadAttentionConfigs: state.multiHeadAttentionConfigs.filter((_, i) => i !== index)
  })),

  repeatVectorConfigs: [],
  addRepeatVectorConfig: () => set((state) => ({
    repeatVectorConfigs: [...state.repeatVectorConfigs, { n: 2 }]
  })),
  updateRepeatVectorConfig: (index, config) => set((state) => ({
    repeatVectorConfigs: state.repeatVectorConfigs.map((c, i) => (i === index ? { ...c, ...config } : c))
  })),
  removeRepeatVectorConfig: (index) => set((state) => ({
    repeatVectorConfigs: state.repeatVectorConfigs.filter((_, i) => i !== index)
  })),

  // 优化器和损失函数
  optimizerConfig: {
    type: 'adam',
    learningRate: 0.001,
    beta1: 0.9,
    beta2: 0.999,
    epsilon: 1e-7,
    decay: 0.0,
  },
  updateOptimizerConfig: (config) => set((state) => ({
    optimizerConfig: {...state.optimizerConfig, ...config}
  })),

  lossConfig: {
    type: 'categoricalCrossentropy',
  },
  updateLossConfig: (config) => set((state) => ({
    lossConfig: {...state.lossConfig, ...config}
  })),

  // 节点管理
  nodes: [],
  addNode: (type, configIndex, id) => set((state) => {
    const defaultPosition = { x: 100, y: 100 };
    let newNode = { 
      id: id || `${type}-${Date.now()}`, 
      type, 
      configIndex,
      position: defaultPosition,
      data: {
        index: configIndex,
        sequenceId: state.nodes.length
      }
    };
    
    // 添加对应的配置
    const configHandlers = {
      conv2d: () => state.addConv2dConfig(),
      maxPooling2d: () => state.addMaxPooling2dConfig(),
      dense: () => state.addDenseConfig(),
      dropout: () => state.addDropoutConfig(),
      batchNorm: () => state.addBatchNormConfig(),
      flatten: () => state.addFlattenConfig(),
      lstm: () => state.addLstmConfig(),
      gru: () => state.addGruConfig(),
      activation: () => state.addActivationConfig(),
      reshape: () => state.addReshapeConfig(),
      avgPooling2d: () => state.addAvgPooling2dConfig(),
    };
    
    if (configHandlers[type] && configIndex !== undefined) {
      configHandlers[type]();
    }
    
    return { 
      nodes: [...state.nodes, newNode],
      edges: state.edges
    };
  }),
  
  removeNode: (nodeId) => set((state) => {
    const nodeToRemove = state.nodes.find(node => node.id === nodeId);
    if (!nodeToRemove) return state;

    const newEdges = state.edges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    );
    const newNodes = state.nodes.filter(node => node.id !== nodeId);

    return { 
      nodes: newNodes,
      edges: newEdges
    };
  }),
  
  updateNodePosition: (nodeId, position) => set((state) => ({
    nodes: state.nodes.map(node => 
      node.id === nodeId ? { ...node, position } : node
    )
  })),

  // 边管理
  edges: [],
  addEdge: (source, target) => set((state) => ({
    edges: [...state.edges, { 
      id: `edge-${Date.now()}`,
      source, 
      target,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#007aff' }
    }]
  })),
  removeEdge: (edgeId) => set((state) => ({
    edges: state.edges.filter(edge => edge.id !== edgeId)
  })),

  // 其他状态
  useMnist: false,
  setUseMnist: (value) => set(() => ({ useMnist: value })),

  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  // 连接验证函数
  isValidConnection: (sourceType, targetType) => {
    if (sourceType === 'useData' || sourceType === 'mnist') {
      return ['conv2d', 'dense', 'reshape', 'flatten', 'lstm', 'gru'].includes(targetType);
    }
    
    const processingLayers = [
      'conv2d', 'maxPooling2d', 'avgPooling2d', 'dense', 'dropout', 
      'batchNorm', 'flatten', 'activation', 'reshape', 'lstm', 'gru'
    ];
    
    if (processingLayers.includes(sourceType)) {
      return processingLayers.includes(targetType) || targetType === 'optimizer' || targetType === 'loss';
    }
    
    return false;
  },

  // 获取模型结构
  getModelStructure: () => {
    const state = useStore.getState();
    return state.nodes.map(node => {
      const configMappings = {
        conv2d: state.conv2dConfigs[node.configIndex],
        maxPooling2d: state.maxPooling2dConfigs[node.configIndex],
        dense: state.denseConfigs[node.configIndex],
        dropout: state.dropoutConfigs[node.configIndex],
        batchNorm: state.batchNormConfigs[node.configIndex],
        flatten: state.flattenConfigs[node.configIndex],
        lstm: state.lstmConfigs[node.configIndex],
        gru: state.gruConfigs[node.configIndex],
        activation: state.activationConfigs[node.configIndex],
        reshape: state.reshapeConfigs[node.configIndex],
        avgPooling2d: state.avgPooling2dConfigs[node.configIndex],
        optimizer: state.optimizerConfig,
        loss: state.lossConfig,
      };
      
      return {
        type: node.type,
        config: configMappings[node.type] || {}
      };
    });
  },
}));

// 将store实例放到window对象上以便全局访问
if (typeof window !== 'undefined') {
  window.useStore = useStore;
}

export { useStore };
export default useStore; 