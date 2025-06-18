#!/usr/bin/env python3
"""
ML Backend 启动脚本
"""

import os
import sys
import subprocess
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_dependencies():
    """检查依赖是否安装"""
    try:
        import fastapi
        import uvicorn
        logger.info("✓ FastAPI 已安装")
    except ImportError:
        logger.error("✗ FastAPI 未安装，请运行: pip install -r requirements_ml.txt")
        return False
        
    try:
        import tensorflow as tf
        logger.info(f"✓ TensorFlow {tf.__version__} 已安装")
    except ImportError:
        logger.warning("⚠ TensorFlow 未安装，将无法使用TensorFlow功能")
        
    try:
        import torch
        logger.info(f"✓ PyTorch {torch.__version__} 已安装")
    except ImportError:
        logger.warning("⚠ PyTorch 未安装，将无法使用PyTorch功能")
        
    return True

def main():
    """主函数"""
    logger.info("🚀 启动 Visual ML Model Builder 后端...")
    
    # 检查依赖
    if not check_dependencies():
        logger.error("依赖检查失败，请安装所需依赖")
        sys.exit(1)
    
    # 设置环境变量
    os.environ.setdefault("PYTHONPATH", os.path.dirname(os.path.abspath(__file__)))
    
    # 启动服务器
    try:
        logger.info("启动 FastAPI 服务器...")
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
        logger.info("收到停止信号，正在关闭服务器...")
    except Exception as e:
        logger.error(f"启动服务器时出错: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 