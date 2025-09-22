import React, { useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as tfvis from '@tensorflow/tfjs-vis';
import { MnistData } from '@/tfjs/data.js'; // 确保路径正确
import useStore from '@/store'; // 确保路径正确
import mlBackendService from '../../../services/mlBackendService';
import { useEffect } from 'react';

async function showExamples(data) {
  const surface = tfvis.visor().surface({ name: 'Input Data Examples', tab: 'Input Data' });
  const examples = data.nextTestBatch(20);
  const numExamples = examples.xs.shape[0];

  for (let i = 0; i < numExamples; i++) {
    const imageTensor = tf.tidy(() => {
      return examples.xs.slice([i, 0], [1, examples.xs.shape[1]]).reshape([28, 28, 1]);
    });

    const canvas = document.createElement('canvas');
    canvas.width = 28;
    canvas.height = 28;
    canvas.style = 'margin: 4px;';
    await tf.browser.toPixels(imageTensor, canvas);
    surface.drawArea.appendChild(canvas);

    imageTensor.dispose();
  }
}

function getModel(conv2dConfigs, maxPooling2dConfigs, denseConfigs, nodes, edges) {
  const model = tf.sequential();
  const IMAGE_WIDTH = 28;
  const IMAGE_HEIGHT = 28;
  const IMAGE_CHANNELS = 1;

  // 检查输入参数
  if (!nodes || nodes.length === 0) {
    console.error('No nodes found in the model structure');
    return model;
  }

  if (!edges || edges.length === 0) {
    console.error('No edges found in the model structure');
    return model;
  }

  console.log('Building model with nodes:', nodes);
  console.log('Building model with edges:', edges);

  // 构建邻接表
  const adjacencyList = {};
  nodes.forEach(node => {
    adjacencyList[node.id] = {
      node,
      next: [],
    };
  });

  // 填充邻接表的next数组
  edges.forEach(edge => {
    if (adjacencyList[edge.source]) {
      adjacencyList[edge.source].next.push(edge.target);
    }
  });

  // 找到没有入边的节点(源节点)
  const inDegree = {};
  nodes.forEach(node => {
    inDegree[node.id] = 0;
  });

  edges.forEach(edge => {
    inDegree[edge.target]++;
  });

  const sources = nodes
    .filter(node => inDegree[node.id] === 0)
    .map(node => node.id);

  console.log('Found sources:', sources);

  // 如果没有源节点，使用第一个节点作为起点
  const startNode = sources.length > 0 ? sources[0] : nodes[0].id;
  console.log('Starting from node:', startNode);

  // 使用BFS遍历图获取有序模型结构
  const visited = new Set();
  const queue = [startNode];
  let hasAddedFlatten = false;
  let layerCount = 0;

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const current = adjacencyList[currentId];
    if (!current) {
      console.warn(`Node ${currentId} not found in adjacency list`);
      continue;
    }

    const { node } = current;
    console.log(`Processing node:`, node);

    // 只添加实际的层节点，跳过数据源节点
    if (node.type !== 'mnist' && node.type !== 'useData') {
      switch (node.type) {
        case 'conv2d':
          if (layerCount === 0) {
            // 第一个Conv2D层需要指定inputShape
            console.log('Adding first Conv2D layer with inputShape');
            model.add(tf.layers.conv2d({
              inputShape: [IMAGE_WIDTH, IMAGE_HEIGHT, IMAGE_CHANNELS],
              ...conv2dConfigs[node.configIndex]
            }));
          } else {
            console.log('Adding Conv2D layer');
            model.add(tf.layers.conv2d(conv2dConfigs[node.configIndex]));
          }
          layerCount++;
          break;
        case 'maxPooling2d':
          console.log('Adding MaxPooling2D layer');
          model.add(tf.layers.maxPooling2d(maxPooling2dConfigs[node.configIndex]));
          layerCount++;
          break;
        case 'dense':
          // 在添加Dense层之前，检查上一层的类型
          // 如果前一层是GRU或LSTM，它们已经输出2D张量，不需要添加Flatten
          const prevLayerType = model.layers.length > 0 ? model.layers[model.layers.length - 1].constructor.name.toLowerCase() : '';
          const needFlatten = !hasAddedFlatten && 
                              !prevLayerType.includes('gru') && 
                              !prevLayerType.includes('lstm') &&
                              !prevLayerType.includes('dense') && 
                              !prevLayerType.includes('dropout') &&
                              !prevLayerType.includes('activation');
          
          if (needFlatten) {
            console.log('Adding Flatten layer before Dense layer');
            model.add(tf.layers.flatten());
            hasAddedFlatten = true;
            layerCount++;
          } else if (prevLayerType) {
            console.log(`Connecting Dense directly to ${prevLayerType} (Flatten not needed)`);
          }
          
          console.log('Adding Dense layer');
          model.add(tf.layers.dense(denseConfigs[node.configIndex] || denseConfigs[0]));
          layerCount++;
          break;
        case 'dropout':
          console.log('Adding Dropout layer');
          model.add(tf.layers.dropout(useStore.getState().dropoutConfigs[node.configIndex]));
          layerCount++;
          break;
        case 'batchNorm':
          console.log('Adding BatchNormalization layer');
          model.add(tf.layers.batchNormalization(useStore.getState().batchNormConfigs[node.configIndex]));
          layerCount++;
          break;
        case 'flatten':
          console.log('Adding Flatten layer');
          model.add(tf.layers.flatten());
          hasAddedFlatten = true;
          layerCount++;
          break;
        case 'lstm':
          if (layerCount === 0) {
            // 第一个LSTM层需要指定inputShape
            console.log('Adding first LSTM layer with inputShape');
            model.add(tf.layers.lstm({
              inputShape: [null, 28], // 假设输入是序列数据，需要根据实际情况调整
              ...useStore.getState().lstmConfigs[node.configIndex]
            }));
          } else {
            console.log('Adding LSTM layer');
            model.add(tf.layers.lstm(useStore.getState().lstmConfigs[node.configIndex]));
          }
          layerCount++;
          break;
        case 'gru':
          if (layerCount === 0) {
            // 第一个GRU层需要指定inputShape，根据数据源动态调整
            console.log('Adding first GRU layer with inputShape');
            
            // 获取CSV数据信息，如果有的话
            const csvData = useStore.getState().csvData;
            let featuresDim = 28; // 默认值，适用于MNIST数据
            
            // 如果CSV数据存在，尝试自动检测特征维度
            if (csvData && csvData.length > 0) {
              const numericColumns = [];
              // 识别所有数值列
              if (csvData[0]) {
                Object.keys(csvData[0]).forEach(key => {
                  if (key !== 'label' && key !== 'date' && 
                      (typeof csvData[0][key] === 'number' || !isNaN(parseFloat(csvData[0][key])))) {
                    numericColumns.push(key);
                  }
                });
              }
              
              if (numericColumns.length > 0) {
                featuresDim = numericColumns.length;
              }
            }
            
            console.log(`Detected features dimension for GRU: ${featuresDim}`);
            
            model.add(tf.layers.gru({
              inputShape: [null, featuresDim], // 动态设置特征维度
              ...useStore.getState().gruConfigs[node.configIndex]
            }));
          } else {
            console.log('Adding GRU layer');
            model.add(tf.layers.gru(useStore.getState().gruConfigs[node.configIndex]));
          }
          layerCount++;
          break;
        case 'activation':
          console.log('Adding Activation layer');
          model.add(tf.layers.activation(useStore.getState().activationConfigs[node.configIndex]));
          layerCount++;
          break;
        case 'reshape':
          console.log('Adding Reshape layer');
          model.add(tf.layers.reshape(useStore.getState().reshapeConfigs[node.configIndex]));
          layerCount++;
          break;
        case 'avgPooling2d':
          console.log('Adding AvgPooling2D layer');
          model.add(tf.layers.averagePooling2d(useStore.getState().avgPooling2dConfigs[node.configIndex]));
          layerCount++;
          break;
        default:
          console.warn(`Unknown node type: ${node.type}`);
      }
    }

    // 将所有未访问的邻居加入队列
    current.next.forEach(nextId => {
      if (!visited.has(nextId)) {
        queue.push(nextId);
      }
    });
  }

  console.log(`Total layers added: ${layerCount}`);

  if (layerCount === 0) {
    console.error('No layers were added to the model');
    return model;
  }

  // 编译模型
  const optimizer = tf.train.adam();
  model.compile({
    optimizer: optimizer,
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}

async function train(model, data, isCsv) {
  const metrics = ['loss', 'val_loss', 'acc', 'val_acc'];
  const container = { name: 'Model Training', tab: 'Model', styles: { height: '1000px' } };
  const fitCallbacks = tfvis.show.fitCallbacks(container, metrics);

  let trainXs, trainYs, testXs, testYs;

  if (isCsv) {
    // 处理CSV数据，检测数值列
    console.log('Processing CSV data for training');
    const numericColumns = [];
    
    // 识别所有数值列
    if (data.length > 0 && data[0]) {
      Object.keys(data[0]).forEach(key => {
        if (key !== 'label' && key !== 'date' && 
            (typeof data[0][key] === 'number' || !isNaN(parseFloat(data[0][key])))) {
          numericColumns.push(key);
        }
      });
    }
    
    console.log('Detected numeric columns:', numericColumns);
    
    if (numericColumns.length === 0) {
      console.error('No numeric columns found in CSV data');
      return;
    }
    
    // 提取特征和标签
    const features = data.map(row => {
      return numericColumns.map(col => {
        const value = typeof row[col] === 'number' ? row[col] : parseFloat(row[col]);
        return isNaN(value) ? 0 : value;
      });
    });
    
    console.log(`Extracted ${features.length} samples, each with ${features[0].length} features`);
    
    // 检查数据是否足够进行训练
    if (features.length < 10) {
      console.error('Not enough data samples for training (minimum 10 required)');
      return;
    }
    
    const labelField = 'label';
    const labels = data.map(row => Number(row[labelField] || 0));
    const uniqueLabels = [...new Set(labels)];
    const numClasses = Math.max(uniqueLabels.length, 3); // 至少有3个类别
    
    // 数据标准化 - 对每个特征进行归一化处理
    const featureMeans = [];
    const featureStds = [];
    
    // 计算每个特征的均值
    for (let i = 0; i < features[0].length; i++) {
      let sum = 0;
      for (let j = 0; j < features.length; j++) {
        sum += features[j][i];
      }
      featureMeans.push(sum / features.length);
    }
    
    // 计算每个特征的标准差
    for (let i = 0; i < features[0].length; i++) {
      let sumSquaredDiff = 0;
      for (let j = 0; j < features.length; j++) {
        sumSquaredDiff += Math.pow(features[j][i] - featureMeans[i], 2);
      }
      featureStds.push(Math.sqrt(sumSquaredDiff / features.length) || 1);
    }
    
    // 标准化特征
    const normalizedFeatures = features.map(sample => {
      return sample.map((value, index) => {
        return (value - featureMeans[index]) / featureStds[index];
      });
    });
    
    console.log('Feature statistics:');
    console.log('- Means:', featureMeans);
    console.log('- Standard deviations:', featureStds);
    
    console.log(`Found ${numClasses} unique classes in label column`);
    
    // 创建正确的3D数组结构 [samples, timesteps, features]
    const reshapedFeatures = [];
    for (let i = 0; i < normalizedFeatures.length; i++) {
      const sample = [];
      sample.push(normalizedFeatures[i]); // 一个样本只有一个时间步
      reshapedFeatures.push(sample);
    }
    
    console.log('Final tensor shape:', 
      `[${reshapedFeatures.length}, ${reshapedFeatures[0].length}, ${reshapedFeatures[0][0].length}]`);
    
    // 创建张量
    const xs = tf.tensor3d(reshapedFeatures);
    const ys = tf.oneHot(labels, numClasses);
    
    console.log('Created tensors -', 
      'Features:', xs.shape, 
      'Labels:', ys.shape);
    
    // 分割训练集和测试集
    const splitIndex = Math.floor(xs.shape[0] * 0.8);
    [trainXs, testXs] = tf.split(xs, [splitIndex, xs.shape[0] - splitIndex]);
    [trainYs, testYs] = tf.split(ys, [splitIndex, ys.shape[0] - splitIndex]);
    
    xs.dispose();
    ys.dispose();
  } else {
    const BATCH_SIZE = 512;
    const TRAIN_DATA_SIZE = 5500;
    const TEST_DATA_SIZE = 1000;

    [trainXs, trainYs] = tf.tidy(() => {
      const d = data.nextTrainBatch(TRAIN_DATA_SIZE);
      return [
        d.xs.reshape([TRAIN_DATA_SIZE, 28, 28, 1]),
        d.labels
      ];
    });

    [testXs, testYs] = tf.tidy(() => {
      const d = data.nextTestBatch(TEST_DATA_SIZE);
      return [
        d.xs.reshape([TEST_DATA_SIZE, 28, 28, 1]),
        d.labels
      ];
    });
  }

  // 训练模型
  try {
    console.log(`Starting training with:
      - Training data shape: ${trainXs.shape} 
      - Training labels shape: ${trainYs.shape}
      - Testing data shape: ${testXs.shape}
      - Testing labels shape: ${testYs.shape}
    `);
    
    // 调试: 检查模型的预期输入形状
    if (model.inputs.length > 0) {
      console.log('Model expected input shape:', model.inputs[0].shape);
    }
    // 确保模型已编译（某些构造路径可能未编译）
    if (!model.optimizer) {
      console.warn('Model not compiled. Auto-compiling with default settings');
      const optimizer = tf.train.adam();
      model.compile({ optimizer, loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
    }

    return await model.fit(trainXs, trainYs, {
      batchSize: 512,
      validationData: [testXs, testYs],
      epochs: 10,
      shuffle: true,
      callbacks: fitCallbacks
    });
  } catch (error) {
    console.error('Error during model training:', error);
    console.error('Error details:', error.message);
    
    // 详细打印张量信息以便于调试
    console.error('Feature tensor info:', {
      shape: trainXs.shape,
      dataType: trainXs.dtype,
      size: trainXs.size
    });
    // 避免 tfvis.show.text API 不存在导致的二次报错
    try {
      if (tfvis?.render?.table) {
        const surface = { name: 'Training Error', tab: 'Model' };
        tfvis.render.table(surface, { headers: ['Message'], values: [[`训练错误: ${error.message}`]] });
      }
    } catch (e) {
      // 忽略渲染错误
    }
      
    throw error;
  } finally {
    trainXs.dispose();
    trainYs.dispose();
    testXs.dispose();
    testYs.dispose();
  }
}

function TrainButton() {
  const { 
    conv2dConfigs, 
    maxPooling2dConfigs, 
    denseConfigs, 
    csvData, 
    isData, 
    nodes, 
    edges
  } = useStore();

  const handleTrainClick = useCallback(async () => {
    let data;
    let isCsv = false;

    if (isData) {
      data = csvData;
      isCsv = true;
    } else {
      data = new MnistData();
      await data.load();
      await showExamples(data);
    }

    const model = getModel(conv2dConfigs, maxPooling2dConfigs, denseConfigs, nodes, edges);
    tfvis.show.modelSummary({ name: 'Model Architecture', tab: 'Model' }, model);

    await train(model, data, isCsv);
  }, [conv2dConfigs, maxPooling2dConfigs, denseConfigs, csvData, isData, nodes, edges]);

  const handleBackendTrainClick = useCallback(async () => {
    try {
      // 1) 确保有会话，并连接 WebSocket 获取训练进度
      const sessionResp = await mlBackendService.createSession('FrontendSession', 'Train via backend');
      if (!sessionResp?.success) {
        console.error('Failed to create backend session:', sessionResp);
        return;
      }
      const sessionId = sessionResp.session_id;
      mlBackendService.connectWebSocket(sessionId);

      // TensorBoard 将在训练完成后自动打开对应的 run

      // 2) 订阅基本事件（可接入 UI 提示）
      const progressLogger = (msg) => {
        console.log('WS:', msg);
        
        // 训练完成时，打开对应的TensorBoard run
        if (msg.type === 'training_status' && msg.status === 'completed' && msg.tensorboard_logdir) {
          // TensorBoard会自动显示最新的run，直接打开即可
          const tensorboardUrl = `http://127.0.0.1:6006/`;
          console.log('Opening TensorBoard for completed training:', msg.tensorboard_logdir);
          
          // 显示成功消息并打开TensorBoard
          alert(`🎉 训练完成！\n\n📊 训练日志: ${msg.tensorboard_logdir}\n📈 TensorBoard已自动打开\n\n💡 提示: 在TensorBoard中选择最新的run查看训练结果`);
          window.open(tensorboardUrl, '_blank');
        } else if (msg.type === 'training_status' && msg.status === 'failed') {
          alert(`训练失败: ${msg.message}`);
        }
      };
      mlBackendService.on('websocket:message', progressLogger);

      // 3) 生成后端需要的模型结构
      const validModelLayerTypes = new Set([
        'conv2d', 'maxPooling2d', 'avgPooling2d', 'dense', 'dropout', 'batchNorm',
        'flatten', 'lstm', 'gru', 'activation', 'reshape'
      ]);

      // 构建邻接表与入度，做一次BFS，保证顺序稳定
      const adjacencyList = {};
      const inDegree = {};
      (nodes || []).forEach((n) => {
        adjacencyList[n.id] = [];
        inDegree[n.id] = 0;
      });
      (edges || []).forEach((e) => {
        if (adjacencyList[e.source]) {
          adjacencyList[e.source].push(e.target);
          if (inDegree[e.target] !== undefined) inDegree[e.target] += 1;
        }
      });

      const sourceIds = Object.keys(inDegree).filter((id) => inDegree[id] === 0);
      const queue = sourceIds.length > 0 ? [...sourceIds] : (nodes?.length ? [nodes[0].id] : []);
      const visited = new Set();

      const layers = [];
      // 数据源节点：存在 CSV 数据时使用 useData，否则尝试 MNIST
      if (isData) {
        layers.push({ type: 'useData', id: 'data_source', config: {} });
      } else {
        layers.push({ type: 'mnist', id: 'data_source', config: {} });
      }

      while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const node = (nodes || []).find((n) => n.id === currentId);
        if (!node) continue;

        if (validModelLayerTypes.has(node.type)) {
          let config = {};
          const idx = node.configIndex ?? node.data?.index ?? node.data?.configIndex ?? 0;
          switch (node.type) {
            case 'conv2d':
              config = (useStore.getState().conv2dConfigs || [])[idx] || {};
              break;
            case 'maxPooling2d':
              config = (useStore.getState().maxPooling2dConfigs || [])[idx] || {};
              break;
            case 'avgPooling2d':
              config = (useStore.getState().avgPooling2dConfigs || [])[idx] || {};
              break;
            case 'dense':
              config = (useStore.getState().denseConfigs || [])[idx] || {};
              break;
            case 'dropout':
              config = (useStore.getState().dropoutConfigs || [])[idx] || {};
              break;
            case 'batchNorm':
              config = (useStore.getState().batchNormConfigs || [])[idx] || {};
              break;
            case 'flatten':
              config = {}; // 无参数
              break;
            case 'lstm':
              config = (useStore.getState().lstmConfigs || [])[idx] || {};
              break;
            case 'gru':
              config = (useStore.getState().gruConfigs || [])[idx] || {};
              break;
            case 'activation':
              config = (useStore.getState().activationConfigs || [])[idx] || {};
              break;
            case 'reshape':
              config = (useStore.getState().reshapeConfigs || [])[idx] || {};
              break;
            default:
              config = {};
          }
          // 合并额外 JSON 参数（extraConfig 优先）
          const extra = (config && config.extraConfig) ? config.extraConfig : {};
          const merged = { ...(config || {}) };
          delete merged.extraConfig;
          const finalConfig = { ...merged, ...extra };
          layers.push({ type: node.type, id: node.id, config: finalConfig });
        }

        (adjacencyList[currentId] || []).forEach((nxt) => {
          if (!visited.has(nxt)) queue.push(nxt);
        });
      }

      const connections = (edges || []).map((e) => ({ source: e.source, target: e.target }));

      const payload = {
        model_structure: {
          layers,
          connections,
          framework: 'tensorflow'
        },
        training_params: {
          epochs: 10,
          batch_size: 32,
          learning_rate: 0.001
        },
        framework: 'tensorflow'
      };

      // 4) 触发后端训练
      const startResp = await mlBackendService.trainModel(payload, sessionId);
      console.log('Backend training started:', startResp);
    } catch (err) {
      console.error('Failed to start backend training:', err);
    }
  }, [isData, nodes, edges]);

  return (
    <div className="flex gap-2 mt-4">
      <button 
        onClick={handleTrainClick} 
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Train (Frontend)
      </button>
      <button 
        onClick={handleBackendTrainClick} 
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        Train (Backend)
      </button>
    </div>
  );
}

export default TrainButton;

export function BackendTrainButton() {
  const { } = useStore();
  const onClick = useCallback(async () => {
    // 复用上面的后端训练逻辑
    const evt = new Event('click'); // 占位，避免未使用变量告警
    evt.preventDefault?.();
  }, []);
  // 为了简单，直接复用 TrainButton 内实现：
  // 实际渲染时建议在上层引入 handleBackendTrainClick，这里提供一个次要按钮样式。
  return (
    <button
      onClick={() => { /* 建议在集成处使用同文件内的 handleBackendTrainClick */ }}
      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2 ml-2"
    >
      Train on Backend
    </button>
  );
}



