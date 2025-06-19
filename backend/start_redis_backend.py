#!/usr/bin/env python3
"""
Redis版本后端启动脚本
"""

import os
import sys
import subprocess
import time
import logging
from pathlib import Path

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_redis_connection():
    """检查Redis连接"""
    try:
        import redis
        client = redis.Redis(host='localhost', port=6379, db=0)
        client.ping()
        logger.info("✅ Redis连接成功")
        return True
    except Exception as e:
        logger.warning(f"⚠️  Redis连接失败: {e}")
        return False

def install_dependencies():
    """安装依赖"""
    logger.info("📦 安装Python依赖...")
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements_redis.txt"
        ], check=True)
        logger.info("✅ 依赖安装完成")
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ 依赖安装失败: {e}")
        sys.exit(1)

def start_redis_server():
    """启动Redis服务器（如果需要）"""
    if not check_redis_connection():
        logger.info("🚀 尝试启动Redis服务器...")
        
        # 检查系统是否有Redis
        redis_commands = ['redis-server', '/usr/local/bin/redis-server', '/opt/homebrew/bin/redis-server']
        
        for cmd in redis_commands:
            try:
                # 尝试启动Redis（后台运行）
                subprocess.Popen([cmd, '--daemonize', 'yes'], 
                               stdout=subprocess.DEVNULL, 
                               stderr=subprocess.DEVNULL)
                time.sleep(2)  # 等待启动
                
                if check_redis_connection():
                    logger.info("✅ Redis服务器启动成功")
                    return True
            except FileNotFoundError:
                continue
        
        logger.warning("⚠️  无法启动Redis服务器，将使用内存缓存降级模式")
        return False
    
    return True

def setup_environment():
    """设置环境变量"""
    os.environ.setdefault('REDIS_HOST', 'localhost')
    os.environ.setdefault('REDIS_PORT', '6379')
    os.environ.setdefault('REDIS_DB', '0')
    os.environ.setdefault('REDIS_DEFAULT_TTL', '3600')  # 1小时
    
    logger.info("🔧 环境变量配置完成")

def create_directories():
    """创建必要的目录"""
    directories = ['cache', 'data', 'ml_converters', 'logs']
    
    for dir_name in directories:
        Path(dir_name).mkdir(exist_ok=True)
    
    logger.info("📁 目录结构创建完成")

def start_backend():
    """启动后端服务"""
    logger.info("🚀 启动ML后端服务...")
    
    try:
        import uvicorn
        from ml_backend import app
        
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
            access_log=True
        )
    except ImportError:
        logger.error("❌ FastAPI/Uvicorn未安装，请先安装依赖")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ 后端启动失败: {e}")
        sys.exit(1)

def main():
    """主函数"""
    logger.info("🎯 启动Redis版本ML后端")
    
    # 检查Python版本
    if sys.version_info < (3, 8):
        logger.error("❌ 需要Python 3.8或更高版本")
        sys.exit(1)
    
    # 切换到脚本目录
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    try:
        # 1. 创建目录结构
        create_directories()
        
        # 2. 安装依赖
        if not Path("requirements_redis.txt").exists():
            logger.error("❌ 找不到requirements_redis.txt文件")
            sys.exit(1)
        
        install_dependencies()
        
        # 3. 设置环境
        setup_environment()
        
        # 4. 启动Redis（可选）
        start_redis_server()
        
        # 5. 启动后端
        start_backend()
        
    except KeyboardInterrupt:
        logger.info("👋 服务已停止")
    except Exception as e:
        logger.error(f"❌ 启动过程中出错: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 