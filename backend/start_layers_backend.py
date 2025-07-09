#!/usr/bin/env python3
"""
启动层组件系统后端
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_dependencies():
    """检查依赖包是否安装"""
    # 必需的包
    required_packages = [
        'fastapi', 'uvicorn', 'pydantic', 'pandas', 
        'numpy', 'redis', 'torch'
    ]
    
    # 可选的包
    optional_packages = ['tensorflow']
    
    missing_required = []
    missing_optional = []
    
    # 检查必需包
    for package in required_packages:
        try:
            __import__(package)
            logger.info(f"✓ {package} 已安装")
        except ImportError:
            missing_required.append(package)
            logger.error(f"✗ {package} 未安装")
    
    # 检查可选包
    for package in optional_packages:
        try:
            __import__(package)
            logger.info(f"✓ {package} 已安装")
        except ImportError:
            missing_optional.append(package)
            logger.warning(f"✗ {package} 未安装 (可选)")
    
    if missing_required:
        logger.error(f"缺少必需依赖包: {', '.join(missing_required)}")
        logger.info("请运行: pip install -r requirements_layers.txt")
        return False
    
    if missing_optional:
        logger.warning(f"缺少可选依赖包: {', '.join(missing_optional)}")
        logger.info("某些功能可能不可用，但系统仍可正常运行")
    
    return True

def check_redis_connection():
    """检查Redis连接"""
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, decode_responses=True)
        r.ping()
        logger.info("✓ Redis连接正常")
        return True
    except Exception as e:
        logger.warning(f"Redis连接失败: {e}")
        logger.info("系统将使用内存缓存作为备选方案")
        return False

def initialize_layer_system():
    """初始化层组件系统"""
    try:
        # 导入层组件模块以触发注册
        from ml_layers import get_all_layers
        layers = get_all_layers()
        
        logger.info(f"✓ 层组件系统初始化完成")
        logger.info(f"  - 已注册 {len(layers)} 个层类型")
        
        # 按分类统计
        categories = {}
        for layer_type, layer in layers.items():
            category = layer.category
            if category not in categories:
                categories[category] = []
            categories[category].append(layer_type)
        
        for category, layer_types in categories.items():
            logger.info(f"  - {category}: {len(layer_types)} 个层")
        
        return True
        
    except Exception as e:
        logger.error(f"层组件系统初始化失败: {e}")
        return False

def start_server():
    """启动服务器"""
    try:
        logger.info("正在启动ML层组件后端服务器...")
        logger.info("服务器地址: http://localhost:8000")
        logger.info("API文档: http://localhost:8000/docs")
        logger.info("按 Ctrl+C 停止服务器")
        
        # 启动uvicorn服务器
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "ml_backend:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--reload",
            "--log-level", "info"
        ])
        
    except KeyboardInterrupt:
        logger.info("服务器已停止")
    except Exception as e:
        logger.error(f"启动服务器失败: {e}")

def main():
    """主函数"""
    logger.info("=== ML层组件系统后端启动器 ===")
    
    # 检查当前目录
    current_dir = Path.cwd()
    backend_dir = Path(__file__).parent
    
    if current_dir != backend_dir:
        logger.info(f"切换到后端目录: {backend_dir}")
        os.chdir(backend_dir)
    
    # 添加当前目录到Python路径
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    
    # 检查依赖
    logger.info("1. 检查依赖包...")
    if not check_dependencies():
        return 1
    
    # 检查Redis
    logger.info("2. 检查Redis连接...")
    check_redis_connection()
    
    # 初始化层组件系统
    logger.info("3. 初始化层组件系统...")
    if not initialize_layer_system():
        return 1
    
    # 启动服务器
    logger.info("4. 启动服务器...")
    start_server()
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 