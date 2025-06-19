import React, { useState, useEffect } from 'react';
import { 
  Play, 
  CheckCircle, 
  Code, 
  Download, 
  Upload, 
  BarChart3, 
  Settings, 
  Save,
  FileText,
  AlertCircle,
  Loader,
  Zap
} from 'lucide-react';
import mlBackendService from '../services/mlBackendService';

const ModelToolbar = ({ nodes, edges, onSessionCreated }) => {
  const [isValidating, setIsValidating] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [modelCode, setModelCode] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [modelAnalysis, setModelAnalysis] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [framework, setFramework] = useState('pytorch');

  useEffect(() => {
    // 初始化会话
    initializeSession();
    
    // 监听WebSocket事件
    mlBackendService.on('websocket:training_progress', handleTrainingProgress);
    mlBackendService.on('websocket:training_complete', handleTrainingComplete);
    
    return () => {
      mlBackendService.off('websocket:training_progress', handleTrainingProgress);
      mlBackendService.off('websocket:training_complete', handleTrainingComplete);
    };
  }, []);

  const initializeSession = async () => {
    try {
      if (!mlBackendService.isSessionActive()) {
        const response = await mlBackendService.createSession(
          `Session_${Date.now()}`,
          '可视化模型构建会话'
        );
        
        if (response.success) {
          setSessionStatus('active');
          // 尝试连接WebSocket，但不阻塞其他功能
          try {
            mlBackendService.connectWebSocket();
          } catch (error) {
            console.warn('WebSocket connection failed, but session is still active:', error);
          }
          if (onSessionCreated) {
            onSessionCreated(response.session_id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setSessionStatus('error');
    }
  };

  const handleTrainingProgress = (data) => {
    console.log('Training progress:', data);
    // 可以在这里更新训练进度UI
  };

  const handleTrainingComplete = (data) => {
    console.log('Training complete:', data);
    setIsTraining(false);
  };

  const validateModel = async () => {
    if (nodes.length === 0) {
      alert('请先添加一些层组件');
      return;
    }

    setIsValidating(true);
    try {
      const modelConfig = mlBackendService.convertFlowToModelConfig(
        nodes, 
        edges, 
        'VisualModel',
        [28, 28, 1] // 默认输入形状，可以从UI获取
      );

      const response = await mlBackendService.validateModel(modelConfig);
      setValidationResult(response.validation);
      
      if (response.validation.is_valid) {
        alert('✅ 模型验证通过！');
      } else {
        alert(`❌ 模型验证失败:\n${response.validation.errors.join('\n')}`);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      alert('验证失败: ' + error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const buildModel = async () => {
    if (nodes.length === 0) {
      alert('请先添加一些层组件');
      return;
    }

    setIsBuilding(true);
    try {
      const modelConfig = mlBackendService.convertFlowToModelConfig(
        nodes, 
        edges, 
        'VisualModel',
        [28, 28, 1]
      );

      let response;
      if (framework === 'pytorch') {
        response = await mlBackendService.buildPyTorchModel(modelConfig);
      } else {
        response = await mlBackendService.buildTensorFlowModel(modelConfig);
      }

      if (response.success) {
        setModelCode(response.code);
        setShowCodeModal(true);
      } else {
        alert(`代码生成失败:\n${response.errors?.join('\n')}`);
      }
    } catch (error) {
      console.error('Build failed:', error);
      alert('构建失败: ' + error.message);
    } finally {
      setIsBuilding(false);
    }
  };

  const analyzeModel = async () => {
    if (nodes.length === 0) {
      alert('请先添加一些层组件');
      return;
    }

    try {
      const modelConfig = mlBackendService.convertFlowToModelConfig(
        nodes, 
        edges, 
        'VisualModel',
        [28, 28, 1]
      );

      const response = await mlBackendService.analyzeModelComplexity(modelConfig);
      
      if (response.success) {
        setModelAnalysis(response.analysis);
        setShowAnalysisModal(true);
      } else {
        alert(`分析失败:\n${response.errors?.join('\n')}`);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('分析失败: ' + error.message);
    }
  };

  const downloadCode = () => {
    if (!modelCode) return;

    const blob = new Blob([modelCode.complete_code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model_${framework}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 会话状态 */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                sessionStatus === 'active' ? 'bg-green-500' : 
                sessionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <span className="text-sm text-gray-600">
                {sessionStatus === 'active' ? '已连接' : 
                 sessionStatus === 'error' ? '连接失败' : '连接中...'}
              </span>
            </div>

            {/* 框架选择 */}
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pytorch">PyTorch</option>
              <option value="tensorflow">TensorFlow</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            {/* 验证模型 */}
            <button
              onClick={validateModel}
              disabled={isValidating || nodes.length === 0}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isValidating ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>验证</span>
            </button>

            {/* 生成代码 */}
            <button
              onClick={buildModel}
              disabled={isBuilding || nodes.length === 0}
              className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isBuilding ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Code className="w-4 h-4" />
              )}
              <span>生成代码</span>
            </button>

            {/* 分析模型 */}
            <button
              onClick={analyzeModel}
              disabled={nodes.length === 0}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>分析</span>
            </button>

            {/* 训练模型 */}
            <button
              onClick={() => alert('训练功能开发中...')}
              disabled={isTraining || nodes.length === 0}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTraining ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>训练</span>
            </button>
          </div>
        </div>

        {/* 验证结果显示 */}
        {validationResult && (
          <div className="mt-3 p-3 rounded-lg border">
            {validationResult.is_valid ? (
              <div className="flex items-center space-x-2 text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span>模型验证通过</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span>模型验证失败</span>
                </div>
                {validationResult.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 ml-6">
                    • {error}
                  </div>
                ))}
              </div>
            )}
            
            {validationResult.warnings?.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-yellow-700 text-sm font-medium">警告:</div>
                {validationResult.warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-600 ml-4">
                    • {warning}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 代码模态框 */}
      {showCodeModal && modelCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  生成的 {framework} 代码
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={downloadCode}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>下载</span>
                  </button>
                  <button
                    onClick={() => setShowCodeModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{modelCode.complete_code}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 模型分析模态框 */}
      {showAnalysisModal && modelAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">模型复杂度分析</h2>
                <button
                  onClick={() => setShowAnalysisModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* 总体信息 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-blue-600 text-sm font-medium">总参数数量</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {modelAnalysis.total_parameters?.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-green-600 text-sm font-medium">层数量</div>
                    <div className="text-2xl font-bold text-green-900">
                      {modelAnalysis.total_layers}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-purple-600 text-sm font-medium">输入形状</div>
                    <div className="text-lg font-bold text-purple-900">
                      {JSON.stringify(modelAnalysis.input_shape)}
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-orange-600 text-sm font-medium">输出形状</div>
                    <div className="text-lg font-bold text-orange-900">
                      {JSON.stringify(modelAnalysis.output_shape)}
                    </div>
                  </div>
                </div>

                {/* 层详情 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">层详情</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">索引</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">层类型</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">输入形状</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">输出形状</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">参数数量</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modelAnalysis.layer_details?.map((layer, index) => (
                          <tr key={index} className="border-t border-gray-200">
                            <td className="px-4 py-2 text-sm text-gray-900">{layer.layer_index}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{layer.layer_type}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {JSON.stringify(layer.input_shape)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {JSON.stringify(layer.output_shape)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {layer.parameters?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModelToolbar; 