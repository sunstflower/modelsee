"""
文件上传和数据处理模块
支持多种数据格式的上传、验证和预处理
"""

import os
import uuid
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from fastapi import UploadFile, HTTPException
import aiofiles
import json
import logging
from pathlib import Path
import zipfile
import tarfile
from PIL import Image
import io

logger = logging.getLogger(__name__)

class DataHandler:
    """数据处理器"""
    
    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(exist_ok=True)
        
        # 支持的文件格式
        self.supported_formats = {
            'csv': self._process_csv,
            'json': self._process_json,
            'xlsx': self._process_excel,
            'xls': self._process_excel,
            'parquet': self._process_parquet,
            'h5': self._process_hdf5,
            'zip': self._process_zip,
            'tar': self._process_tar,
            'gz': self._process_tar,
            # 图像格式
            'jpg': self._process_image,
            'jpeg': self._process_image,
            'png': self._process_image,
            'bmp': self._process_image,
            'tiff': self._process_image,
        }
        
        # 最大文件大小 (100MB)
        self.max_file_size = 100 * 1024 * 1024
        
    async def upload_file(self, file: UploadFile, session_id: str) -> Dict[str, Any]:
        """上传文件并返回文件信息"""
        try:
            # 验证文件
            await self._validate_file(file)
            
            # 生成唯一文件名
            file_id = str(uuid.uuid4())
            file_extension = Path(file.filename).suffix.lower().lstrip('.')
            filename = f"{session_id}_{file_id}.{file_extension}"
            file_path = self.upload_dir / filename
            
            # 保存文件
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # 获取文件信息
            file_info = {
                'file_id': file_id,
                'original_name': file.filename,
                'file_path': str(file_path),
                'file_size': len(content),
                'file_type': file_extension,
                'session_id': session_id
            }
            
            logger.info(f"文件上传成功: {file.filename} -> {filename}")
            return file_info
            
        except Exception as e:
            logger.error(f"文件上传失败: {e}")
            raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")
    
    async def process_data(self, file_info: Dict[str, Any], 
                          processing_config: Dict[str, Any] = None) -> Dict[str, Any]:
        """处理数据文件"""
        try:
            file_path = Path(file_info['file_path'])
            file_type = file_info['file_type']
            
            if file_type not in self.supported_formats:
                raise ValueError(f"不支持的文件格式: {file_type}")
            
            # 调用相应的处理函数
            processor = self.supported_formats[file_type]
            data_info = await processor(file_path, processing_config or {})
            
            # 添加文件信息
            data_info.update({
                'file_id': file_info['file_id'],
                'original_name': file_info['original_name'],
                'file_size': file_info['file_size'],
                'session_id': file_info['session_id']
            })
            
            return data_info
            
        except Exception as e:
            logger.error(f"数据处理失败: {e}")
            raise HTTPException(status_code=500, detail=f"数据处理失败: {str(e)}")
    
    async def _validate_file(self, file: UploadFile):
        """验证上传的文件"""
        # 检查文件大小
        content = await file.read()
        if len(content) > self.max_file_size:
            raise HTTPException(
                status_code=413, 
                detail=f"文件太大，最大支持 {self.max_file_size // (1024*1024)}MB"
            )
        
        # 重置文件指针
        await file.seek(0)
        
        # 检查文件扩展名
        if file.filename:
            extension = Path(file.filename).suffix.lower().lstrip('.')
            if extension not in self.supported_formats:
                raise HTTPException(
                    status_code=400,
                    detail=f"不支持的文件格式: {extension}"
                )
    
    async def _process_csv(self, file_path: Path, config: Dict) -> Dict[str, Any]:
        """处理CSV文件"""
        try:
            # 读取CSV
            df = pd.read_csv(
                file_path,
                encoding=config.get('encoding', 'utf-8'),
                sep=config.get('separator', ','),
                header=config.get('header', 'infer'),
                nrows=config.get('max_rows', None)
            )
            
            # 数据分析
            analysis = self._analyze_dataframe(df)
            
            # 保存处理后的数据
            processed_path = file_path.with_suffix('.processed.parquet')
            df.to_parquet(processed_path)
            
            return {
                'data_type': 'tabular',
                'format': 'csv',
                'shape': df.shape,
                'columns': df.columns.tolist(),
                'dtypes': df.dtypes.astype(str).to_dict(),
                'analysis': analysis,
                'processed_path': str(processed_path),
                'sample_data': df.head().to_dict('records')
            }
            
        except Exception as e:
            raise ValueError(f"CSV处理失败: {str(e)}")
    
    async def _process_json(self, file_path: Path, config: Dict) -> Dict[str, Any]:
        """处理JSON文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 尝试转换为DataFrame
            if isinstance(data, list) and len(data) > 0:
                df = pd.DataFrame(data)
                analysis = self._analyze_dataframe(df)
                
                # 保存处理后的数据
                processed_path = file_path.with_suffix('.processed.parquet')
                df.to_parquet(processed_path)
                
                return {
                    'data_type': 'tabular',
                    'format': 'json',
                    'shape': df.shape,
                    'columns': df.columns.tolist(),
                    'dtypes': df.dtypes.astype(str).to_dict(),
                    'analysis': analysis,
                    'processed_path': str(processed_path),
                    'sample_data': df.head().to_dict('records')
                }
            else:
                return {
                    'data_type': 'json',
                    'format': 'json',
                    'structure': type(data).__name__,
                    'size': len(str(data)),
                    'sample_data': str(data)[:1000] if len(str(data)) > 1000 else str(data)
                }
                
        except Exception as e:
            raise ValueError(f"JSON处理失败: {str(e)}")
    
    async def _process_excel(self, file_path: Path, config: Dict) -> Dict[str, Any]:
        """处理Excel文件"""
        try:
            # 读取Excel
            df = pd.read_excel(
                file_path,
                sheet_name=config.get('sheet_name', 0),
                header=config.get('header', 0),
                nrows=config.get('max_rows', None)
            )
            
            analysis = self._analyze_dataframe(df)
            
            # 保存处理后的数据
            processed_path = file_path.with_suffix('.processed.parquet')
            df.to_parquet(processed_path)
            
            return {
                'data_type': 'tabular',
                'format': 'excel',
                'shape': df.shape,
                'columns': df.columns.tolist(),
                'dtypes': df.dtypes.astype(str).to_dict(),
                'analysis': analysis,
                'processed_path': str(processed_path),
                'sample_data': df.head().to_dict('records')
            }
            
        except Exception as e:
            raise ValueError(f"Excel处理失败: {str(e)}")
    
    async def _process_parquet(self, file_path: Path, config: Dict) -> Dict[str, Any]:
        """处理Parquet文件"""
        try:
            df = pd.read_parquet(file_path)
            analysis = self._analyze_dataframe(df)
            
            return {
                'data_type': 'tabular',
                'format': 'parquet',
                'shape': df.shape,
                'columns': df.columns.tolist(),
                'dtypes': df.dtypes.astype(str).to_dict(),
                'analysis': analysis,
                'processed_path': str(file_path),
                'sample_data': df.head().to_dict('records')
            }
            
        except Exception as e:
            raise ValueError(f"Parquet处理失败: {str(e)}")
    
    async def _process_hdf5(self, file_path: Path, config: Dict) -> Dict[str, Any]:
        """处理HDF5文件"""
        try:
            # 这里需要h5py库
            import h5py
            
            with h5py.File(file_path, 'r') as f:
                keys = list(f.keys())
                
                # 尝试读取第一个数据集
                if keys:
                    dataset = f[keys[0]]
                    data_shape = dataset.shape
                    data_type = str(dataset.dtype)
                    
                    return {
                        'data_type': 'hdf5',
                        'format': 'hdf5',
                        'keys': keys,
                        'shape': data_shape,
                        'dtype': data_type,
                        'processed_path': str(file_path)
                    }
                else:
                    return {
                        'data_type': 'hdf5',
                        'format': 'hdf5',
                        'keys': [],
                        'processed_path': str(file_path)
                    }
                    
        except ImportError:
            raise ValueError("需要安装h5py库来处理HDF5文件")
        except Exception as e:
            raise ValueError(f"HDF5处理失败: {str(e)}")
    
    async def _process_image(self, file_path: Path, config: Dict) -> Dict[str, Any]:
        """处理图像文件"""
        try:
            with Image.open(file_path) as img:
                # 图像信息
                info = {
                    'data_type': 'image',
                    'format': img.format.lower(),
                    'size': img.size,  # (width, height)
                    'mode': img.mode,  # RGB, RGBA, L, etc.
                    'channels': len(img.getbands()) if img.getbands() else 1,
                    'processed_path': str(file_path)
                }
                
                # 如果需要，转换为numpy数组并保存
                if config.get('convert_to_array', False):
                    img_array = np.array(img)
                    processed_path = file_path.with_suffix('.npy')
                    np.save(processed_path, img_array)
                    info['array_path'] = str(processed_path)
                    info['array_shape'] = img_array.shape
                
                return info
                
        except Exception as e:
            raise ValueError(f"图像处理失败: {str(e)}")
    
    async def _process_zip(self, file_path: Path, config: Dict) -> Dict[str, Any]:
        """处理ZIP文件"""
        try:
            extract_dir = file_path.parent / f"{file_path.stem}_extracted"
            extract_dir.mkdir(exist_ok=True)
            
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
                file_list = zip_ref.namelist()
            
            return {
                'data_type': 'archive',
                'format': 'zip',
                'extracted_path': str(extract_dir),
                'file_count': len(file_list),
                'file_list': file_list[:10],  # 只显示前10个文件
                'processed_path': str(extract_dir)
            }
            
        except Exception as e:
            raise ValueError(f"ZIP处理失败: {str(e)}")
    
    async def _process_tar(self, file_path: Path, config: Dict) -> Dict[str, Any]:
        """处理TAR文件"""
        try:
            extract_dir = file_path.parent / f"{file_path.stem}_extracted"
            extract_dir.mkdir(exist_ok=True)
            
            with tarfile.open(file_path, 'r:*') as tar_ref:
                tar_ref.extractall(extract_dir)
                file_list = tar_ref.getnames()
            
            return {
                'data_type': 'archive',
                'format': 'tar',
                'extracted_path': str(extract_dir),
                'file_count': len(file_list),
                'file_list': file_list[:10],
                'processed_path': str(extract_dir)
            }
            
        except Exception as e:
            raise ValueError(f"TAR处理失败: {str(e)}")
    
    def _analyze_dataframe(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析DataFrame的统计信息"""
        try:
            analysis = {
                'row_count': len(df),
                'column_count': len(df.columns),
                'memory_usage': df.memory_usage(deep=True).sum(),
                'missing_values': df.isnull().sum().to_dict(),
                'data_types': df.dtypes.astype(str).to_dict(),
            }
            
            # 数值列统计
            numeric_columns = df.select_dtypes(include=[np.number]).columns
            if len(numeric_columns) > 0:
                analysis['numeric_summary'] = df[numeric_columns].describe().to_dict()
            
            # 分类列统计
            categorical_columns = df.select_dtypes(include=['object', 'category']).columns
            if len(categorical_columns) > 0:
                analysis['categorical_summary'] = {}
                for col in categorical_columns:
                    analysis['categorical_summary'][col] = {
                        'unique_count': df[col].nunique(),
                        'top_values': df[col].value_counts().head().to_dict()
                    }
            
            return analysis
            
        except Exception as e:
            logger.warning(f"数据分析失败: {e}")
            return {'error': str(e)}
    
    def cleanup_session_files(self, session_id: str):
        """清理会话相关的文件"""
        try:
            for file_path in self.upload_dir.glob(f"{session_id}_*"):
                if file_path.is_file():
                    file_path.unlink()
                elif file_path.is_dir():
                    import shutil
                    shutil.rmtree(file_path)
            logger.info(f"清理会话 {session_id} 的文件")
        except Exception as e:
            logger.error(f"清理文件失败: {e}")

# 全局数据处理器实例
data_handler = DataHandler() 