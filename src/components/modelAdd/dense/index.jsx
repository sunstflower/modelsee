import React, { useEffect, useRef, useState } from 'react';
import NodeContainer from '../NodeContainer';
import useStore from '@/store'; 

function DenseNode({ data }) {
    const { 
        denseConfigs, 
        updateDenseConfig 
    } = useStore();
    
    // 使用传入的index获取对应的配置
    const configIndex = data.index || 0;
    
    // 本地状态管理
    const [localConfig, setLocalConfig] = useState({
        units: 128,
        activation: 'relu',
        kernelInitializer: 'varianceScaling'
    });
    
    // 添加一个ref来跟踪是否已经初始化配置
    const isInitialized = useRef(false);
    
    // 确保配置存在
    useEffect(() => {
        // 如果已经初始化过，或者配置已存在且设置了units，则跳过
        if (isInitialized.current || (denseConfigs[configIndex] && denseConfigs[configIndex].units)) {
            isInitialized.current = true;
            return;
        }
        
        // 标记为已初始化
        isInitialized.current = true;
        
        // 根据是否为最后一个Dense层设置不同的默认值
        const isOutputLayer = data.isOutput || false;
        const defaultUnits = isOutputLayer ? 10 : 128;
        const defaultActivation = isOutputLayer ? 'softmax' : 'relu';
        
        const defaultConfig = { 
            units: defaultUnits,
            activation: defaultActivation,
            kernelInitializer: 'varianceScaling'
        };
        
        updateDenseConfig(configIndex, defaultConfig);
        setLocalConfig(defaultConfig);
        
        console.log(`Dense层 ${configIndex} 设置默认值:`, defaultConfig);
    }, [configIndex, denseConfigs, updateDenseConfig, data.isOutput]);
    
    // 现在安全地获取配置
    const config = denseConfigs[configIndex] || localConfig;

    // 参数更新处理
    const handleParameterChange = (paramName, value) => {
        const newConfig = { ...config, [paramName]: value };
        updateDenseConfig(configIndex, newConfig);
        setLocalConfig(newConfig);
        
        // 如果有回调函数，调用它
        if (data.onParameterChange) {
            data.onParameterChange(paramName, value);
        }
    };

    return (
        <NodeContainer title="Dense" backgroundColor="white" data={data}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="unitsInput" className="block text-sm font-semibold text-gray-700 mb-2">
                        神经元数量 (Units)
                    </label>
                    <input 
                        id="unitsInput" 
                        name="units" 
                        type="number" 
                        value={config.units || 128} 
                        onChange={(e) => handleParameterChange('units', parseInt(e.target.value, 10))}
                        className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        min="1"
                        max="10000"
                    />
                    <p className="text-xs text-gray-500 mt-1">设置该层的神经元数量</p>
                </div>
                
                <div>
                    <label htmlFor="activationSelect" className="block text-sm font-semibold text-gray-700 mb-2">
                        激活函数 (Activation)
                    </label>
                    <select 
                        id="activationSelect" 
                        name="activation" 
                        value={config.activation || 'relu'} 
                        onChange={(e) => handleParameterChange('activation', e.target.value)}
                        className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                        <option value="relu">ReLU</option>
                        <option value="sigmoid">Sigmoid</option>
                        <option value="softmax">Softmax</option>
                        <option value="tanh">Tanh</option>
                        <option value="linear">Linear</option>
                        <option value="leaky_relu">Leaky ReLU</option>
                        <option value="elu">ELU</option>
                        <option value="swish">Swish</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">选择激活函数类型</p>
                </div>
                
                <div>
                    <label htmlFor="kernelInitializerSelect" className="block text-sm font-semibold text-gray-700 mb-2">
                        内核初始化 (Kernel Initializer)
                    </label>
                    <select 
                        id="kernelInitializerSelect" 
                        name="kernelInitializer" 
                        value={config.kernelInitializer || 'varianceScaling'} 
                        onChange={(e) => handleParameterChange('kernelInitializer', e.target.value)}
                        className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                        <option value="varianceScaling">Variance Scaling</option>
                        <option value="glorotUniform">Glorot Uniform</option>
                        <option value="glorotNormal">Glorot Normal</option>
                        <option value="heUniform">He Uniform</option>
                        <option value="heNormal">He Normal</option>
                        <option value="zeros">Zeros</option>
                        <option value="ones">Ones</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">权重初始化方法</p>
                </div>

                {/* 参数摘要 */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">层配置摘要</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                        <div>输出维度: {config.units}</div>
                        <div>激活函数: {config.activation}</div>
                        <div>权重初始化: {config.kernelInitializer}</div>
                    </div>
                </div>
            </div>
        </NodeContainer>
    );
}

export default DenseNode;



