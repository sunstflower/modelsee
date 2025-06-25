/**
 * ML后端服务 - 与ML层组件系统后端API集成
 */

const API_BASE_URL = 'http://localhost:8000';

class MLBackendService {
  constructor() {
    this.sessionId = null;
    this.websocket = null;
    this.eventListeners = new Map();
  }

  // ==================== 基础请求方法 ====================

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // ==================== 健康检查 ====================

  async checkHealth() {
    try {
      return await this.request('/health');
    } catch (error) {
      console.error('Backend health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }

  // ==================== 会话管理 ====================

  async createSession(sessionName = null, description = null) {
    try {
      const response = await this.request('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          session_name: sessionName,
          description: description
        })
      });
      
      if (response.success) {
        this.sessionId = response.session_id;
        console.log('Session created:', this.sessionId);
      }
      
      return response;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  async getSession(sessionId = null) {
    const id = sessionId || this.sessionId;
    if (!id) {
      throw new Error('No session ID provided');
    }
    
    return await this.request(`/sessions/${id}`);
  }

  async listSessions() {
    return await this.request('/sessions');
  }

  async deleteSession(sessionId = null) {
    const id = sessionId || this.sessionId;
    if (!id) {
      throw new Error('No session ID provided');
    }
    
    const response = await this.request(`/sessions/${id}`, {
      method: 'DELETE'
    });
    
    if (response.success && id === this.sessionId) {
      this.sessionId = null;
    }
    
    return response;
  }

  // ==================== 层组件管理 ====================

  async getAllLayers() {
    return await this.request('/layers');
  }

  async getLayerInfo(layerType) {
    return await this.request(`/layers/${layerType}`);
  }

  // ==================== 模型构建与验证 ====================

  async validateModel(modelConfig) {
    return await this.request('/models/validate', {
      method: 'POST',
      body: JSON.stringify(modelConfig)
    });
  }

  async buildTensorFlowModel(modelConfig) {
    return await this.request('/models/build/tensorflow', {
      method: 'POST',
      body: JSON.stringify(modelConfig)
    });
  }

  async buildPyTorchModel(modelConfig) {
    return await this.request('/models/build/pytorch', {
      method: 'POST',
      body: JSON.stringify(modelConfig)
    });
  }

  async analyzeModelComplexity(modelConfig) {
    return await this.request('/models/analyze', {
      method: 'POST',
      body: JSON.stringify(modelConfig)
    });
  }

  // ==================== 数据处理 ====================

  async uploadData(file, sessionId = null) {
    const id = sessionId || this.sessionId;
    if (!id) {
      throw new Error('No session ID provided');
    }

    const formData = new FormData();
    formData.append('file', file);

    return await this.request(`/sessions/${id}/upload`, {
      method: 'POST',
      headers: {}, // 让浏览器自动设置Content-Type
      body: formData
    });
  }

  async getDataInfo(sessionId = null) {
    const id = sessionId || this.sessionId;
    if (!id) {
      throw new Error('No session ID provided');
    }
    
    return await this.request(`/sessions/${id}/data/info`);
  }

  async getDataPreview(dataType = 'raw_data', sessionId = null) {
    const id = sessionId || this.sessionId;
    if (!id) {
      throw new Error('No session ID provided');
    }
    
    return await this.request(`/sessions/${id}/data/preview?data_type=${dataType}`);
  }

  // ==================== 模型训练 ====================

  async trainModel(trainingConfig, sessionId = null) {
    const id = sessionId || this.sessionId;
    if (!id) {
      throw new Error('No session ID provided');
    }
    
    return await this.request(`/sessions/${id}/train`, {
      method: 'POST',
      body: JSON.stringify(trainingConfig)
    });
  }

  // ==================== WebSocket 实时通信 ====================

  connectWebSocket(sessionId = null) {
    const id = sessionId || this.sessionId;
    if (!id) {
      console.warn('No session ID provided for WebSocket connection');
      return null;
    }

    if (this.websocket) {
      this.websocket.close();
    }

    try {
      const wsUrl = `ws://localhost:8000/ws/${id}`;
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        this.emit('websocket:connected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data);
          this.emit('websocket:message', data);
          
          // 根据消息类型触发特定事件
          if (data.type) {
            this.emit(`websocket:${data.type}`, data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        this.emit('websocket:disconnected');
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('websocket:error', error);
      };

      return this.websocket;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.emit('websocket:error', error);
      return null;
    }
  }

  disconnectWebSocket() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  // ==================== 事件系统 ====================

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Event listener error for ${event}:`, error);
        }
      });
    }
  }

  // ==================== 系统监控 ====================

  async getCacheStatus() {
    return await this.request('/system/cache/status');
  }

  async cleanupCache() {
    return await this.request('/system/cache/cleanup', {
      method: 'POST'
    });
  }

  // ==================== 工具方法 ====================

  getCurrentSessionId() {
    return this.sessionId;
  }

  isSessionActive() {
    return !!this.sessionId;
  }

  // 从React Flow节点转换为后端模型配置
  convertFlowToModelConfig(nodes, edges, modelName = 'CustomModel', inputShape = null) {
    // 过滤出层节点（排除数据节点等）
    const layerNodes = nodes.filter(node => 
      node.type !== 'input' && 
      node.type !== 'output' && 
      node.data.layerType
    );

    // 根据位置或连接关系排序节点
    layerNodes.sort((a, b) => a.position.y - b.position.y);

    const layers = layerNodes.map(node => ({
      type: node.data.layerType,
      parameters: node.data.parameters || {},
      id: node.id,
      name: node.data.label
    }));

    return {
      name: modelName,
      input_shape: inputShape,
      layers: layers,
      framework: 'pytorch' // 默认使用PyTorch
    };
  }

  // 清理资源
  cleanup() {
    this.disconnectWebSocket();
    this.eventListeners.clear();
    this.sessionId = null;
  }
}

// 创建全局实例
const mlBackendService = new MLBackendService();

export default mlBackendService; 