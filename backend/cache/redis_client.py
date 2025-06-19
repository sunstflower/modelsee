"""
Redis客户端 - 用于临时数据缓存
"""

import redis
import json
import pickle
import gzip
import pandas as pd
import numpy as np
from typing import Any, Optional, Dict, List
import logging
from datetime import datetime, timedelta
import os

logger = logging.getLogger(__name__)

class RedisDataCache:
    """Redis数据缓存管理器"""
    
    def __init__(self, 
                 host: str = "localhost", 
                 port: int = 6379, 
                 db: int = 0,
                 password: Optional[str] = None,
                 default_ttl: int = 3600):  # 默认1小时过期
        """
        初始化Redis连接
        
        Args:
            host: Redis服务器地址
            port: Redis端口
            db: 数据库编号
            password: 密码
            default_ttl: 默认过期时间(秒)
        """
        self.default_ttl = default_ttl
        
        try:
            self.redis_client = redis.Redis(
                host=host,
                port=port,
                db=db,
                password=password,
                decode_responses=False,  # 处理二进制数据
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True
            )
            
            # 测试连接
            self.redis_client.ping()
            logger.info(f"Redis连接成功: {host}:{port}/{db}")
            
        except redis.ConnectionError as e:
            logger.error(f"Redis连接失败: {e}")
            # 降级到内存缓存
            self.redis_client = None
            self._memory_cache = {}
            logger.warning("降级使用内存缓存")
    
    def _is_redis_available(self) -> bool:
        """检查Redis是否可用"""
        return self.redis_client is not None
    
    def _get_key(self, session_id: str, data_type: str) -> str:
        """生成Redis键"""
        return f"session:{session_id}:{data_type}"
    
    # ==================== 数据存储方法 ====================
    
    def store_dataframe(self, session_id: str, data_type: str, df: pd.DataFrame, ttl: Optional[int] = None) -> bool:
        """
        存储Pandas DataFrame
        
        Args:
            session_id: 会话ID
            data_type: 数据类型 (raw_data, processed_data等)
            df: DataFrame对象
            ttl: 过期时间(秒)，None使用默认值
        """
        try:
            key = self._get_key(session_id, data_type)
            ttl = ttl or self.default_ttl
            
            # 序列化和压缩DataFrame
            serialized_data = pickle.dumps(df)
            compressed_data = gzip.compress(serialized_data)
            
            if self._is_redis_available():
                self.redis_client.setex(key, ttl, compressed_data)
                logger.debug(f"DataFrame存储到Redis: {key}, 大小: {len(compressed_data)} bytes")
            else:
                # 降级到内存缓存
                self._memory_cache[key] = {
                    'data': compressed_data,
                    'expires_at': datetime.now() + timedelta(seconds=ttl)
                }
                logger.debug(f"DataFrame存储到内存缓存: {key}")
            
            return True
            
        except Exception as e:
            logger.error(f"存储DataFrame失败: {e}")
            return False
    
    def get_dataframe(self, session_id: str, data_type: str) -> Optional[pd.DataFrame]:
        """
        获取Pandas DataFrame
        
        Args:
            session_id: 会话ID
            data_type: 数据类型
            
        Returns:
            DataFrame对象或None
        """
        try:
            key = self._get_key(session_id, data_type)
            
            if self._is_redis_available():
                compressed_data = self.redis_client.get(key)
            else:
                # 从内存缓存获取
                cache_entry = self._memory_cache.get(key)
                if cache_entry and cache_entry['expires_at'] > datetime.now():
                    compressed_data = cache_entry['data']
                else:
                    compressed_data = None
                    if cache_entry:  # 过期数据清理
                        del self._memory_cache[key]
            
            if compressed_data is None:
                return None
            
            # 解压缩和反序列化
            serialized_data = gzip.decompress(compressed_data)
            df = pickle.loads(serialized_data)
            
            logger.debug(f"从缓存获取DataFrame: {key}, 形状: {df.shape}")
            return df
            
        except Exception as e:
            logger.error(f"获取DataFrame失败: {e}")
            return None
    
    def store_json(self, session_id: str, data_type: str, data: Dict, ttl: Optional[int] = None) -> bool:
        """
        存储JSON数据
        
        Args:
            session_id: 会话ID
            data_type: 数据类型
            data: 字典数据
            ttl: 过期时间(秒)
        """
        try:
            key = self._get_key(session_id, data_type)
            ttl = ttl or self.default_ttl
            json_data = json.dumps(data, ensure_ascii=False, default=str)
            
            if self._is_redis_available():
                self.redis_client.setex(key, ttl, json_data)
            else:
                self._memory_cache[key] = {
                    'data': json_data,
                    'expires_at': datetime.now() + timedelta(seconds=ttl)
                }
            
            logger.debug(f"JSON数据存储: {key}")
            return True
            
        except Exception as e:
            logger.error(f"存储JSON失败: {e}")
            return False
    
    def get_json(self, session_id: str, data_type: str) -> Optional[Dict]:
        """获取JSON数据"""
        try:
            key = self._get_key(session_id, data_type)
            
            if self._is_redis_available():
                json_data = self.redis_client.get(key)
                if json_data:
                    json_data = json_data.decode('utf-8')
            else:
                cache_entry = self._memory_cache.get(key)
                if cache_entry and cache_entry['expires_at'] > datetime.now():
                    json_data = cache_entry['data']
                else:
                    json_data = None
                    if cache_entry:
                        del self._memory_cache[key]
            
            if json_data is None:
                return None
            
            return json.loads(json_data)
            
        except Exception as e:
            logger.error(f"获取JSON失败: {e}")
            return None
    
    # ==================== 会话管理方法 ====================
    
    def store_session_info(self, session_id: str, info: Dict, ttl: Optional[int] = None) -> bool:
        """存储会话信息"""
        return self.store_json(session_id, "info", info, ttl)
    
    def get_session_info(self, session_id: str) -> Optional[Dict]:
        """获取会话信息"""
        return self.get_json(session_id, "info")
    
    def update_session_access(self, session_id: str) -> bool:
        """更新会话最后访问时间"""
        try:
            info = self.get_session_info(session_id) or {}
            info['last_accessed'] = datetime.now().isoformat()
            return self.store_session_info(session_id, info)
        except Exception as e:
            logger.error(f"更新会话访问时间失败: {e}")
            return False
    
    def store_processing_progress(self, session_id: str, progress: Dict, ttl: Optional[int] = None) -> bool:
        """存储处理进度"""
        return self.store_json(session_id, "processing_progress", progress, ttl)
    
    def get_processing_progress(self, session_id: str) -> Optional[Dict]:
        """获取处理进度"""
        return self.get_json(session_id, "processing_progress")
    
    # ==================== 数据管理方法 ====================
    
    def store_data_metadata(self, session_id: str, metadata: Dict, ttl: Optional[int] = None) -> bool:
        """存储数据元信息"""
        return self.store_json(session_id, "metadata", metadata, ttl)
    
    def get_data_metadata(self, session_id: str) -> Optional[Dict]:
        """获取数据元信息"""
        return self.get_json(session_id, "metadata")
    
    def clear_session_data(self, session_id: str) -> bool:
        """清理会话的所有数据"""
        try:
            # 数据类型列表
            data_types = [
                "info", "raw_data", "processed_data", "metadata", 
                "processing_progress", "training_progress", "model_structure"
            ]
            
            if self._is_redis_available():
                keys_to_delete = [self._get_key(session_id, dt) for dt in data_types]
                # 批量删除
                if keys_to_delete:
                    deleted_count = self.redis_client.delete(*keys_to_delete)
                    logger.info(f"Redis清理会话 {session_id}: 删除了 {deleted_count} 个键")
            else:
                # 内存缓存清理
                deleted_count = 0
                for dt in data_types:
                    key = self._get_key(session_id, dt)
                    if key in self._memory_cache:
                        del self._memory_cache[key]
                        deleted_count += 1
                logger.info(f"内存缓存清理会话 {session_id}: 删除了 {deleted_count} 个键")
            
            return True
            
        except Exception as e:
            logger.error(f"清理会话数据失败: {e}")
            return False
    
    def get_session_keys(self, session_id: str) -> List[str]:
        """获取会话的所有键"""
        try:
            if self._is_redis_available():
                pattern = f"session:{session_id}:*"
                keys = self.redis_client.keys(pattern)
                return [key.decode('utf-8') if isinstance(key, bytes) else key for key in keys]
            else:
                pattern_prefix = f"session:{session_id}:"
                return [key for key in self._memory_cache.keys() if key.startswith(pattern_prefix)]
        except Exception as e:
            logger.error(f"获取会话键失败: {e}")
            return []
    
    def get_all_active_sessions(self) -> List[str]:
        """获取所有活跃会话ID"""
        try:
            if self._is_redis_available():
                keys = self.redis_client.keys("session:*:info")
                session_ids = []
                for key in keys:
                    key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                    # 从 "session:session_id:info" 中提取 session_id
                    parts = key_str.split(':')
                    if len(parts) >= 3:
                        session_ids.append(parts[1])
                return list(set(session_ids))  # 去重
            else:
                session_ids = set()
                for key in self._memory_cache.keys():
                    if ':info' in key:
                        parts = key.split(':')
                        if len(parts) >= 3:
                            session_ids.add(parts[1])
                return list(session_ids)
        except Exception as e:
            logger.error(f"获取活跃会话失败: {e}")
            return []
    
    # ==================== 工具方法 ====================
    
    def get_memory_usage(self) -> Dict[str, Any]:
        """获取缓存使用情况"""
        try:
            if self._is_redis_available():
                info = self.redis_client.info('memory')
                return {
                    'used_memory_human': info.get('used_memory_human', 'Unknown'),
                    'used_memory_peak_human': info.get('used_memory_peak_human', 'Unknown'),
                    'connected_clients': self.redis_client.info('clients').get('connected_clients', 0),
                    'total_keys': self.redis_client.dbsize()
                }
            else:
                import sys
                total_size = sum(
                    sys.getsizeof(entry['data']) 
                    for entry in self._memory_cache.values()
                )
                return {
                    'used_memory_human': f"{total_size / 1024 / 1024:.2f}MB",
                    'total_keys': len(self._memory_cache),
                    'cache_type': 'memory'
                }
        except Exception as e:
            logger.error(f"获取内存使用情况失败: {e}")
            return {}
    
    def cleanup_expired_sessions(self) -> int:
        """清理过期会话 (仅内存缓存需要)"""
        if self._is_redis_available():
            return 0  # Redis自动过期
        
        try:
            current_time = datetime.now()
            expired_keys = []
            
            for key, entry in self._memory_cache.items():
                if entry['expires_at'] <= current_time:
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self._memory_cache[key]
            
            logger.info(f"清理了 {len(expired_keys)} 个过期缓存项")
            return len(expired_keys)
            
        except Exception as e:
            logger.error(f"清理过期会话失败: {e}")
            return 0

# 全局Redis客户端实例
redis_cache = None

def get_redis_cache() -> RedisDataCache:
    """获取Redis缓存实例"""
    global redis_cache
    if redis_cache is None:
        # 从环境变量读取配置
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        redis_db = int(os.getenv('REDIS_DB', 0))
        redis_password = os.getenv('REDIS_PASSWORD')
        default_ttl = int(os.getenv('REDIS_DEFAULT_TTL', 3600))
        
        redis_cache = RedisDataCache(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            password=redis_password,
            default_ttl=default_ttl
        )
    
    return redis_cache 