"""
临时数据处理器 - 基于Redis缓存的数据处理
"""

import pandas as pd
import numpy as np
import io
import json
from typing import Dict, List, Optional, Any, Tuple, Union
import logging
from datetime import datetime
import asyncio
from fastapi import UploadFile
import chardet
import sys
import os

# 可选导入magic库
try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cache.redis_client import get_redis_cache

logger = logging.getLogger(__name__)

class TempDataProcessor:
    """临时数据处理器"""
    
    def __init__(self):
        self.redis_cache = get_redis_cache()
        self.supported_formats = {
            '.csv': self._read_csv,
            '.xlsx': self._read_excel,
            '.xls': self._read_excel,
            '.json': self._read_json,
            '.parquet': self._read_parquet,
            '.tsv': self._read_tsv
        }
        
    # ==================== 文件读取方法 ====================
    
    async def upload_and_process(self, 
                                session_id: str, 
                                file: UploadFile,
                                processing_options: Optional[Dict] = None) -> Dict[str, Any]:
        """
        上传并处理文件
        
        Args:
            session_id: 会话ID
            file: 上传的文件
            processing_options: 处理选项
            
        Returns:
            处理结果字典
        """
        try:
            logger.info(f"开始处理文件: {file.filename}, 会话: {session_id}")
            
            # 读取文件内容
            file_content = await file.read()
            file_size = len(file_content)
            
            # 检测文件格式
            file_format = self._detect_file_format(file.filename)
            
            # 检测编码
            encoding = self._detect_encoding(file_content)
            
            # 读取数据
            df = await self._read_file_content(file_content, file_format, encoding, processing_options)
            
            # 生成数据元信息
            metadata = self._generate_metadata(df, file.filename, file_size, file_format, encoding)
            
            # 存储原始数据到Redis
            success = self.redis_cache.store_dataframe(session_id, "raw_data", df)
            if not success:
                raise Exception("存储原始数据失败")
            
            # 存储元信息
            self.redis_cache.store_data_metadata(session_id, metadata)
            
            # 更新会话信息
            self._update_session_info(session_id, {
                'has_data': True,
                'data_uploaded_at': datetime.now().isoformat(),
                'file_name': file.filename,
                'file_size': file_size,
                'data_shape': df.shape
            })
            
            logger.info(f"文件处理完成: {file.filename}, 形状: {df.shape}")
            
            return {
                'success': True,
                'metadata': metadata,
                'preview': self._generate_preview(df),
                'message': f'成功处理文件 {file.filename}'
            }
            
        except Exception as e:
            logger.error(f"文件处理失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': f'处理文件 {file.filename} 时出错'
            }
    
    def _detect_file_format(self, filename: str) -> str:
        """检测文件格式"""
        if filename:
            for ext in self.supported_formats.keys():
                if filename.lower().endswith(ext):
                    return ext
        return '.csv'
    
    def _detect_encoding(self, content: bytes) -> str:
        """检测文件编码"""
        try:
            result = chardet.detect(content)
            return result['encoding'] if result['confidence'] > 0.7 else 'utf-8'
        except:
            return 'utf-8'
    
    async def _read_file_content(self, 
                                content: bytes, 
                                file_format: str, 
                                encoding: str,
                                options: Optional[Dict] = None) -> pd.DataFrame:
        """读取文件内容为DataFrame"""
        options = options or {}
        
        if file_format not in self.supported_formats:
            raise ValueError(f"不支持的文件格式: {file_format}")
        
        # 使用对应的读取方法
        reader_func = self.supported_formats[file_format]
        return reader_func(content, encoding, options)
    
    def _read_csv(self, content: bytes, encoding: str, options: Dict) -> pd.DataFrame:
        """读取CSV文件"""
        try:
            # 默认参数
            read_params = {
                'sep': options.get('separator', ','),
                'encoding': encoding,
                'na_values': ['', 'NULL', 'null', 'NaN', 'nan'],
                'keep_default_na': True,
                'low_memory': False
            }
            
            # 处理可选参数
            if 'has_header' in options:
                read_params['header'] = 0 if options['has_header'] else None
            
            if 'skip_rows' in options:
                read_params['skiprows'] = options['skip_rows']
            
            # 读取数据
            df = pd.read_csv(io.BytesIO(content), **read_params)
            
            return df
            
        except Exception as e:
            logger.error(f"读取CSV文件失败: {e}")
            raise
    
    def _read_excel(self, content: bytes, encoding: str, options: Dict) -> pd.DataFrame:
        """读取Excel文件"""
        try:
            read_params = {
                'sheet_name': options.get('sheet_name', 0),
                'na_values': ['', 'NULL', 'null', 'NaN', 'nan']
            }
            
            if 'has_header' in options:
                read_params['header'] = 0 if options['has_header'] else None
            
            df = pd.read_excel(io.BytesIO(content), **read_params)
            return df
            
        except Exception as e:
            logger.error(f"读取Excel文件失败: {e}")
            raise
    
    def _read_json(self, content: bytes, encoding: str, options: Dict) -> pd.DataFrame:
        """读取JSON文件"""
        try:
            json_str = content.decode(encoding)
            
            # 尝试不同的JSON格式
            try:
                # 标准JSON数组
                df = pd.read_json(json_str, orient='records')
            except:
                try:
                    # 行分隔的JSON
                    df = pd.read_json(json_str, lines=True)
                except:
                    # 嵌套JSON，尝试规范化
                    data = json.loads(json_str)
                    df = pd.json_normalize(data)
            
            return df
            
        except Exception as e:
            logger.error(f"读取JSON文件失败: {e}")
            raise
    
    def _read_parquet(self, content: bytes, encoding: str, options: Dict) -> pd.DataFrame:
        """读取Parquet文件"""
        try:
            df = pd.read_parquet(io.BytesIO(content))
            return df
        except Exception as e:
            logger.error(f"读取Parquet文件失败: {e}")
            raise
    
    def _read_tsv(self, content: bytes, encoding: str, options: Dict) -> pd.DataFrame:
        """读取TSV文件"""
        options['separator'] = '\t'
        return self._read_csv(content, encoding, options)
    
    # ==================== 数据处理方法 ====================
    
    async def process_data(self, 
                          session_id: str, 
                          processing_config: Dict,
                          progress_callback: Optional[callable] = None) -> Dict[str, Any]:
        """
        处理数据
        
        Args:
            session_id: 会话ID
            processing_config: 处理配置
            progress_callback: 进度回调函数
        """
        try:
            logger.info(f"开始数据处理: 会话 {session_id}")
            
            # 获取原始数据
            df = self.redis_cache.get_dataframe(session_id, "raw_data")
            if df is None:
                raise ValueError("未找到原始数据")
            
            processed_df = df.copy()
            total_steps = len(processing_config.get('steps', []))
            
            # 执行处理步骤
            for i, step in enumerate(processing_config.get('steps', [])):
                if progress_callback:
                    await progress_callback({
                        'stage': 'processing',
                        'step': i + 1,
                        'total_steps': total_steps,
                        'progress': (i + 1) / total_steps,
                        'current_operation': step.get('name', '未知操作')
                    })
                
                processed_df = await self._apply_processing_step(processed_df, step)
                
                # 模拟处理时间
                await asyncio.sleep(0.1)
            
            # 存储处理后的数据
            success = self.redis_cache.store_dataframe(session_id, "processed_data", processed_df)
            if not success:
                raise Exception("存储处理后数据失败")
            
            # 生成处理报告
            report = self._generate_processing_report(df, processed_df, processing_config)
            
            # 更新会话信息
            self._update_session_info(session_id, {
                'data_processed': True,
                'processed_at': datetime.now().isoformat(),
                'processed_shape': processed_df.shape
            })
            
            logger.info(f"数据处理完成: 会话 {session_id}, 处理后形状: {processed_df.shape}")
            
            return {
                'success': True,
                'report': report,
                'preview': self._generate_preview(processed_df),
                'shape': processed_df.shape,
                'message': '数据处理完成'
            }
            
        except Exception as e:
            logger.error(f"数据处理失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': '数据处理失败'
            }
    
    async def _apply_processing_step(self, df: pd.DataFrame, step: Dict) -> pd.DataFrame:
        """应用单个处理步骤"""
        step_type = step.get('type')
        params = step.get('params', {})
        
        if step_type == 'drop_duplicates':
            return df.drop_duplicates()
        
        elif step_type == 'drop_na':
            return df.dropna()
        
        elif step_type == 'fill_na':
            fill_value = params.get('value', 0)
            return df.fillna(fill_value)
        
        elif step_type == 'remove_outliers':
            return self._remove_outliers(df, params)
        
        elif step_type == 'normalize':
            return self._normalize_data(df, params)
        
        elif step_type == 'encode_categorical':
            return self._encode_categorical(df, params)
        
        else:
            logger.warning(f"未知的处理步骤类型: {step_type}")
            return df
    
    def _remove_outliers(self, df: pd.DataFrame, params: Dict) -> pd.DataFrame:
        """移除异常值"""
        method = params.get('method', 'iqr')
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        if method == 'iqr':
            for col in numeric_columns:
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]
        
        return df
    
    def _normalize_data(self, df: pd.DataFrame, params: Dict) -> pd.DataFrame:
        """数据标准化"""
        method = params.get('method', 'standard')
        columns = params.get('columns', df.select_dtypes(include=[np.number]).columns)
        
        if method == 'standard':
            # Z-score标准化
            df[columns] = (df[columns] - df[columns].mean()) / df[columns].std()
        elif method == 'minmax':
            # Min-Max归一化
            df[columns] = (df[columns] - df[columns].min()) / (df[columns].max() - df[columns].min())
        
        return df
    
    def _encode_categorical(self, df: pd.DataFrame, params: Dict) -> pd.DataFrame:
        """分类变量编码"""
        method = params.get('method', 'onehot')
        columns = params.get('columns', df.select_dtypes(include=['object']).columns)
        
        if method == 'onehot':
            df = pd.get_dummies(df, columns=columns, prefix=columns)
        elif method == 'label':
            from sklearn.preprocessing import LabelEncoder
            le = LabelEncoder()
            for col in columns:
                df[col] = le.fit_transform(df[col].astype(str))
        
        return df
    
    # ==================== 数据分割方法 ====================
    
    async def split_data(self, 
                        session_id: str, 
                        split_config: Dict) -> Dict[str, Any]:
        """
        分割数据为训练集和测试集
        
        Args:
            session_id: 会话ID
            split_config: 分割配置
        """
        try:
            # 获取处理后的数据
            df = self.redis_cache.get_dataframe(session_id, "processed_data")
            if df is None:
                # 如果没有处理后的数据，使用原始数据
                df = self.redis_cache.get_dataframe(session_id, "raw_data")
                if df is None:
                    raise ValueError("未找到数据")
            
            test_size = split_config.get('test_size', 0.2)
            random_state = split_config.get('random_state', 42)
            stratify_column = split_config.get('stratify_column')
            
            # 执行分割
            if stratify_column and stratify_column in df.columns:
                # 分层抽样
                from sklearn.model_selection import train_test_split
                train_df, test_df = train_test_split(
                    df, 
                    test_size=test_size, 
                    random_state=random_state,
                    stratify=df[stratify_column]
                )
            else:
                # 随机分割
                train_df = df.sample(frac=1-test_size, random_state=random_state)
                test_df = df.drop(train_df.index)
            
            # 存储分割后的数据
            self.redis_cache.store_dataframe(session_id, "train_data", train_df)
            self.redis_cache.store_dataframe(session_id, "test_data", test_df)
            
            # 更新会话信息
            self._update_session_info(session_id, {
                'data_split': True,
                'split_at': datetime.now().isoformat(),
                'train_shape': train_df.shape,
                'test_shape': test_df.shape
            })
            
            return {
                'success': True,
                'train_shape': train_df.shape,
                'test_shape': test_df.shape,
                'train_preview': self._generate_preview(train_df),
                'test_preview': self._generate_preview(test_df),
                'message': '数据分割完成'
            }
            
        except Exception as e:
            logger.error(f"数据分割失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': '数据分割失败'
            }
    
    # ==================== 工具方法 ====================
    
    def _generate_metadata(self, 
                          df: pd.DataFrame, 
                          filename: str, 
                          file_size: int,
                          file_format: str,
                          encoding: str) -> Dict[str, Any]:
        """生成数据元信息"""
        numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_columns = df.select_dtypes(include=['object']).columns.tolist()
        datetime_columns = df.select_dtypes(include=['datetime64']).columns.tolist()
        
        return {
            'filename': filename,
            'file_size': file_size,
            'file_format': file_format,
            'encoding': encoding,
            'shape': df.shape,
            'columns': df.columns.tolist(),
            'dtypes': df.dtypes.astype(str).to_dict(),
            'numeric_columns': numeric_columns,
            'categorical_columns': categorical_columns,
            'datetime_columns': datetime_columns,
            'missing_values': df.isnull().sum().to_dict(),
            'memory_usage': df.memory_usage(deep=True).sum(),
            'created_at': datetime.now().isoformat()
        }
    
    def _generate_preview(self, df: pd.DataFrame, n_rows: int = 10) -> Dict[str, Any]:
        """生成数据预览"""
        return {
            'head': df.head(n_rows).to_dict('records'),
            'columns': df.columns.tolist(),
            'dtypes': df.dtypes.astype(str).to_dict(),
            'shape': df.shape,
            'describe': df.describe().to_dict() if len(df.select_dtypes(include=[np.number]).columns) > 0 else {}
        }
    
    def _generate_processing_report(self, 
                                   original_df: pd.DataFrame, 
                                   processed_df: pd.DataFrame,
                                   config: Dict) -> Dict[str, Any]:
        """生成处理报告"""
        return {
            'original_shape': original_df.shape,
            'processed_shape': processed_df.shape,
            'rows_changed': original_df.shape[0] - processed_df.shape[0],
            'columns_changed': original_df.shape[1] - processed_df.shape[1],
            'processing_steps': config.get('steps', []),
            'processing_time': datetime.now().isoformat()
        }
    
    def _update_session_info(self, session_id: str, update_data: Dict):
        """更新会话信息"""
        try:
            current_info = self.redis_cache.get_session_info(session_id) or {}
            current_info.update(update_data)
            current_info['last_updated'] = datetime.now().isoformat()
            self.redis_cache.store_session_info(session_id, current_info)
        except Exception as e:
            logger.error(f"更新会话信息失败: {e}")
    
    # ==================== 数据获取方法 ====================
    
    def get_data_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """获取数据信息"""
        metadata = self.redis_cache.get_data_metadata(session_id)
        session_info = self.redis_cache.get_session_info(session_id)
        
        if metadata:
            return {
                'metadata': metadata,
                'session_info': session_info,
                'has_raw_data': self.redis_cache.get_dataframe(session_id, "raw_data") is not None,
                'has_processed_data': self.redis_cache.get_dataframe(session_id, "processed_data") is not None,
                'has_train_data': self.redis_cache.get_dataframe(session_id, "train_data") is not None,
                'has_test_data': self.redis_cache.get_dataframe(session_id, "test_data") is not None
            }
        return None
    
    def get_data_preview(self, session_id: str, data_type: str = "processed_data") -> Optional[Dict[str, Any]]:
        """获取数据预览"""
        df = self.redis_cache.get_dataframe(session_id, data_type)
        if df is not None:
            return self._generate_preview(df)
        return None
    
    def clear_session_data(self, session_id: str) -> bool:
        """清理会话数据"""
        return self.redis_cache.clear_session_data(session_id) 