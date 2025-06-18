"""
ML Session Manager
管理机器学习模型的会话状态
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
import threading
import time
import logging

logger = logging.getLogger(__name__)

class MLSession:
    """机器学习会话类"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.created_at = datetime.now()
        self.last_accessed = datetime.now()
        
        # 模型相关
        self.model_structure = None
        self.model_code = None
        self.trained_model = None
        self.framework = "tensorflow"  # tensorflow 或 pytorch
        
        # 训练状态
        self.is_training = False
        self.training_progress = 0.0
        self.training_logs = []
        self.training_metrics = {}
        
        # 数据相关
        self.training_data = None
        self.validation_data = None
        
        # 导出相关
        self.exported_models = {}  # format -> path
        
    def update_access_time(self):
        """更新最后访问时间"""
        self.last_accessed = datetime.now()
        
    def to_dict(self):
        """转换为字典格式"""
        return {
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat(),
            "last_accessed": self.last_accessed.isoformat(),
            "framework": self.framework,
            "is_training": self.is_training,
            "training_progress": self.training_progress,
            "has_model": self.model_code is not None,
            "has_trained_model": self.trained_model is not None,
            "exported_formats": list(self.exported_models.keys())
        }

class MLSessionManager:
    """机器学习会话管理器"""
    
    def __init__(self, cleanup_interval_minutes: int = 30, session_timeout_hours: int = 24):
        self.sessions: Dict[str, MLSession] = {}
        self.cleanup_interval = cleanup_interval_minutes * 60  # 转换为秒
        self.session_timeout = session_timeout_hours * 3600  # 转换为秒
        self._lock = threading.RLock()
        
        # 启动清理线程
        self._start_cleanup_thread()
        
    def _start_cleanup_thread(self):
        """启动后台清理线程"""
        def cleanup_worker():
            while True:
                try:
                    self.cleanup_expired_sessions()
                    time.sleep(self.cleanup_interval)
                except Exception as e:
                    logger.error(f"会话清理线程异常: {e}")
                    time.sleep(60)  # 异常时等待1分钟再重试
        
        cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
        cleanup_thread.start()
        logger.info("会话清理线程已启动")
        
    def create_session(self) -> MLSession:
        """创建新会话"""
        session_id = str(uuid.uuid4())
        with self._lock:
            session = MLSession(session_id)
            self.sessions[session_id] = session
            logger.info(f"创建新会话: {session_id}")
            return session
            
    def get_session(self, session_id: str) -> Optional[MLSession]:
        """获取会话"""
        with self._lock:
            session = self.sessions.get(session_id)
            if session:
                session.update_access_time()
            return session
            
    def get_or_create_session(self, session_id: Optional[str] = None) -> MLSession:
        """获取或创建会话"""
        if session_id:
            session = self.get_session(session_id)
            if session:
                return session
        
        # 创建新会话
        return self.create_session()
        
    def delete_session(self, session_id: str) -> bool:
        """删除会话"""
        with self._lock:
            if session_id in self.sessions:
                session = self.sessions[session_id]
                
                # 清理资源
                try:
                    if hasattr(session.trained_model, 'cleanup'):
                        session.trained_model.cleanup()
                except Exception as e:
                    logger.warning(f"清理模型资源时出错: {e}")
                
                del self.sessions[session_id]
                logger.info(f"删除会话: {session_id}")
                return True
            return False
            
    def cleanup_expired_sessions(self):
        """清理过期会话"""
        current_time = datetime.now()
        expired_sessions = []
        
        with self._lock:
            for session_id, session in self.sessions.items():
                time_diff = (current_time - session.last_accessed).total_seconds()
                if time_diff > self.session_timeout:
                    expired_sessions.append(session_id)
        
        # 删除过期会话
        for session_id in expired_sessions:
            self.delete_session(session_id)
            
        if expired_sessions:
            logger.info(f"清理了 {len(expired_sessions)} 个过期会话")
            
    def get_session_count(self) -> int:
        """获取当前会话数量"""
        with self._lock:
            return len(self.sessions)
            
    def get_all_sessions_info(self) -> Dict[str, Dict]:
        """获取所有会话信息"""
        with self._lock:
            return {
                session_id: session.to_dict() 
                for session_id, session in self.sessions.items()
            }
            
    def update_training_progress(self, session_id: str, progress: float, metrics: Dict[str, Any] = None):
        """更新训练进度"""
        session = self.get_session(session_id)
        if session:
            session.training_progress = progress
            if metrics:
                session.training_metrics.update(metrics)
            logger.debug(f"会话 {session_id} 训练进度: {progress:.2%}")
            
    def add_training_log(self, session_id: str, log_entry: str):
        """添加训练日志"""
        session = self.get_session(session_id)
        if session:
            timestamp = datetime.now().isoformat()
            session.training_logs.append({
                "timestamp": timestamp,
                "message": log_entry
            })
            # 限制日志数量，避免内存溢出
            if len(session.training_logs) > 1000:
                session.training_logs = session.training_logs[-500:]  # 保留最新的500条
                
    def set_training_status(self, session_id: str, is_training: bool):
        """设置训练状态"""
        session = self.get_session(session_id)
        if session:
            session.is_training = is_training
            if not is_training:
                session.training_progress = 1.0 if session.training_progress > 0.99 else session.training_progress
            logger.info(f"会话 {session_id} 训练状态: {'进行中' if is_training else '已停止'}")
            
    def get_session_stats(self) -> Dict[str, Any]:
        """获取会话统计信息"""
        with self._lock:
            total_sessions = len(self.sessions)
            training_sessions = sum(1 for s in self.sessions.values() if s.is_training)
            frameworks = {}
            
            for session in self.sessions.values():
                framework = session.framework
                frameworks[framework] = frameworks.get(framework, 0) + 1
                
            return {
                "total_sessions": total_sessions,
                "training_sessions": training_sessions,
                "frameworks": frameworks,
                "cleanup_interval_minutes": self.cleanup_interval // 60,
                "session_timeout_hours": self.session_timeout // 3600
            } 