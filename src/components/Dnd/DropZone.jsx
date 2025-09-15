import React from 'react';
import { useDrop } from 'react-dnd';
import presetModelService from '../../services/presetModelService';
import { applyPresetToCanvas } from '../../utils/presetModelApplier';
import useStore from '../../store';

const DropZone = ({ onAddNode }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: [
      'layer',
      'presetModel',
      'useData',
      'mnist',
      'conv2d',
      'maxPooling2d',
      'avgPooling2d',
      'dense',
      'dropout',
      'batchNorm',
      'flatten',
      'lstm',
      'gru',
      'activation',
      'reshape',
      'trainButton'
    ],
    drop: async (item, monitor) => {
      const offset = monitor.getClientOffset();
      const dropPosition = {
        x: offset?.x ? offset.x - 200 : 100, // 调整相对于画布的位置
        y: offset?.y ? offset.y - 100 : 100
      };
      
      if (item.type === 'layer') {
        // 处理单个层拖放
        onAddNode(item.layerType, dropPosition);
      } else {
        // 兼容旧版本
        onAddNode(item.type, dropPosition);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`w-full h-full min-h-[500px] ${
        isOver ? 'bg-blue-50' : 'bg-white'
      } transition-colors duration-200`}
    />
  );
};

export default DropZone;