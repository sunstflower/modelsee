/**
 * 预置模型服务 - 管理和加载预置模型配置
 */

class PresetModelService {
  constructor() {
    this.modelsIndex = null;
    this.loadedModels = new Map();
  }

  /**
   * 加载模型索引
   */
  async loadModelsIndex() {
    if (this.modelsIndex) {
      return this.modelsIndex;
    }

    try {
      const response = await fetch('/models/presets/index.json');
      if (!response.ok) {
        throw new Error(`Failed to load models index: ${response.status}`);
      }
      this.modelsIndex = await response.json();
      return this.modelsIndex;
    } catch (error) {
      console.error('Error loading models index:', error);
      // 降级到静态配置
      this.modelsIndex = {
        models: [
          {
            id: "resnet18-mini",
            name: "ResNet-18 (Mini)",
            description: "Simplified ResNet-18 for MNIST",
            framework: "tensorflow",
            category: "cnn",
            complexity: "medium"
          },
          {
            id: "lenet5",
            name: "LeNet-5", 
            description: "Classic CNN for digit recognition",
            framework: "tensorflow",
            category: "cnn",
            complexity: "simple"
          }
        ]
      };
      return this.modelsIndex;
    }
  }

  /**
   * 获取所有模型列表
   */
  async getAllModels() {
    const index = await this.loadModelsIndex();
    return index.models;
  }

  /**
   * 根据ID加载具体模型配置
   */
  async loadModelById(modelId) {
    if (this.loadedModels.has(modelId)) {
      return this.loadedModels.get(modelId);
    }

    try {
      const response = await fetch(`/models/presets/${modelId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load model ${modelId}: ${response.status}`);
      }
      
      const modelConfig = await response.json();
      this.loadedModels.set(modelId, modelConfig);
      return modelConfig;
    } catch (error) {
      console.error(`Error loading model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * 根据分类获取模型
   */
  async getModelsByCategory(category) {
    const models = await this.getAllModels();
    return models.filter(model => model.category === category);
  }

  /**
   * 根据复杂度获取模型
   */
  async getModelsByComplexity(complexity) {
    const models = await this.getAllModels();
    return models.filter(model => model.complexity === complexity);
  }

  /**
   * 验证模型配置
   */
  validateModelConfig(config) {
    const required = ['id', 'name', 'framework', 'layers'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      throw new Error(`Model config missing required fields: ${missing.join(', ')}`);
    }

    if (!Array.isArray(config.layers) || config.layers.length === 0) {
      throw new Error('Model must have at least one layer');
    }

    return true;
  }
}

// 创建单例实例
const presetModelService = new PresetModelService();

export default presetModelService;
