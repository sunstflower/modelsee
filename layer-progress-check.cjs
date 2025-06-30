const fs = require('fs');
const path = require('path');

// 后端44个层组件列表
const backendLayers = [
  "additive_attention",
  "alpha_dropout", 
  "attention_pooling",
  "avgpool2d",
  "batch_normalization",
  "conv1d",
  "conv2d",
  "conv3d",
  "cosine_normalization",
  "cropping2d",
  "cross_attention",
  "dense",
  "dropout",
  "elu",
  "flatten",
  "gaussian_dropout",
  "gelu",
  "group_normalization",
  "gru",
  "instance_normalization",
  "lambda",
  "layer_normalization",
  "leaky_relu",
  "local_response_normalization",
  "lstm",
  "masking",
  "maxpool2d",
  "mish",
  "multi_head_attention",
  "permute",
  "prelu",
  "relu",
  "repeat_vector",
  "reshape",
  "self_attention",
  "separable_conv2d",
  "sigmoid",
  "softmax",
  "spectral_normalization",
  "swish",
  "tanh",
  "unit_normalization",
  "weight_normalization",
  "zero_padding2d"
];

// 前端组件名称映射
const frontendMapping = {
  "additive_attention": "additiveAttention",
  "alpha_dropout": "alphaDropout",
  "attention_pooling": "attentionPooling", 
  "avgpool2d": "avgPooling2d",
  "batch_normalization": "batchNorm",
  "conv1d": "conv1d",
  "conv2d": "conv2d1", // 注意这里的映射
  "conv3d": "conv3d",
  "cosine_normalization": "cosineNormalization",
  "cropping2d": "cropping2d",
  "cross_attention": "crossAttention",
  "dense": "dense",
  "dropout": "dropout",
  "elu": "activation", // ELU是激活函数的一种
  "flatten": "flatten",
  "gaussian_dropout": "gaussianDropout",
  "gelu": "activation", // GELU是激活函数的一种
  "group_normalization": "groupNormalization",
  "gru": "gru",
  "instance_normalization": "instanceNormalization",
  "lambda": "lambda",
  "layer_normalization": "layerNormalization",
  "leaky_relu": "activation", // LeakyReLU是激活函数的一种
  "local_response_normalization": "localResponseNormalization",
  "lstm": "lstm",
  "masking": "masking",
  "maxpool2d": "maxPooling2d",
  "mish": "activation", // Mish是激活函数的一种
  "multi_head_attention": "multiHeadAttention",
  "permute": "permute",
  "prelu": "activation", // PReLU是激活函数的一种
  "relu": "activation", // ReLU是激活函数的一种
  "repeat_vector": "repeatVector",
  "reshape": "reshape",
  "self_attention": "selfAttention",
  "separable_conv2d": "separableConv2d",
  "sigmoid": "activation", // Sigmoid是激活函数的一种
  "softmax": "activation", // Softmax是激活函数的一种
  "spectral_normalization": "spectralNormalization",
  "swish": "activation", // Swish是激活函数的一种
  "tanh": "activation", // Tanh是激活函数的一种
  "unit_normalization": "unitNormalization",
  "weight_normalization": "weightNormalization",
  "zero_padding2d": "zeroPadding2d"
};

// 检查已存在的前端组件
function checkExistingComponents() {
  const modelAddPath = path.join(__dirname, 'src/components/modelAdd');
  const existingComponents = [];
  
  try {
    const items = fs.readdirSync(modelAddPath);
    for (const item of items) {
      const itemPath = path.join(modelAddPath, item);
      if (fs.statSync(itemPath).isDirectory()) {
        const indexPath = path.join(itemPath, 'index.jsx');
        if (fs.existsSync(indexPath)) {
          existingComponents.push(item);
        }
      }
    }
  } catch (error) {
    console.error('Error reading modelAdd directory:', error);
    return [];
  }
  
  return existingComponents.sort();
}

// 主检查函数
function checkProgress() {
  console.log('🔍 检查层组件实现进度...\n');
  
  const existingComponents = checkExistingComponents();
  console.log(`📁 已创建的前端组件 (${existingComponents.length}个):`);
  existingComponents.forEach(comp => console.log(`  ✓ ${comp}`));
  
  console.log(`\n🎯 后端层组件总数: ${backendLayers.length}个`);
  
  // 检查已实现的层
  const implementedLayers = [];
  const missingLayers = [];
  
  backendLayers.forEach(backendLayer => {
    const frontendName = frontendMapping[backendLayer];
    if (existingComponents.includes(frontendName)) {
      implementedLayers.push(backendLayer);
    } else {
      missingLayers.push(backendLayer);
    }
  });
  
  console.log(`\n✅ 已实现的层 (${implementedLayers.length}个):`);
  implementedLayers.forEach(layer => {
    const frontendName = frontendMapping[layer];
    console.log(`  ✓ ${layer} → ${frontendName}`);
  });
  
  console.log(`\n❌ 缺少的层 (${missingLayers.length}个):`);
  missingLayers.forEach(layer => {
    const frontendName = frontendMapping[layer];
    console.log(`  ✗ ${layer} → ${frontendName}`);
  });
  
  // 计算进度
  const progress = (implementedLayers.length / backendLayers.length * 100).toFixed(1);
  console.log(`\n📊 实现进度: ${implementedLayers.length}/${backendLayers.length} (${progress}%)`);
  
  // 按类别分组缺失的层
  const missingByCategory = {
    '激活函数': [],
    '归一化层': [],
    '注意力层': [], 
    '正则化层': [],
    '工具层': [],
    '其他': []
  };
  
  missingLayers.forEach(layer => {
    if (['elu', 'gelu', 'leaky_relu', 'mish', 'prelu', 'relu', 'sigmoid', 'softmax', 'swish', 'tanh'].includes(layer)) {
      missingByCategory['激活函数'].push(layer);
    } else if (layer.includes('normalization')) {
      missingByCategory['归一化层'].push(layer);
    } else if (layer.includes('attention')) {
      missingByCategory['注意力层'].push(layer);
    } else if (layer.includes('dropout')) {
      missingByCategory['正则化层'].push(layer);
    } else if (['cropping2d', 'lambda', 'masking'].includes(layer)) {
      missingByCategory['工具层'].push(layer);
    } else {
      missingByCategory['其他'].push(layer);
    }
  });
  
  console.log('\n📋 缺失层分类:');
  Object.entries(missingByCategory).forEach(([category, layers]) => {
    if (layers.length > 0) {
      console.log(`  ${category} (${layers.length}个): ${layers.join(', ')}`);
    }
  });
  
  // 优先级建议
  console.log('\n🎯 建议优先实现:');
  console.log('  1. 高优先级: gaussian_dropout, masking, cropping2d');
  console.log('  2. 中优先级: group_normalization, instance_normalization, self_attention');
  console.log('  3. 低优先级: 各种归一化层和特殊激活函数');
  
  return {
    total: backendLayers.length,
    implemented: implementedLayers.length,
    missing: missingLayers.length,
    progress: parseFloat(progress),
    missingLayers,
    missingByCategory
  };
}

// 运行检查
if (require.main === module) {
  checkProgress();
}

module.exports = { checkProgress, backendLayers, frontendMapping }; 