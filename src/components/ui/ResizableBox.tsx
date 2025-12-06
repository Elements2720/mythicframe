import React from 'react';
import { Rnd } from 'react-rnd';

interface ResizableBoxProps {
  x: number;
  y: number;
  width: number;
  height: number | string;
  onDragStop: (x: number, y: number) => void;
  onResizeStop: (width: number, height: number, x: number, y: number) => void;
  label?: string;
  color?: string;
  showDimensions?: boolean;
  containerWidth: number;
  containerHeight: number;
  isSelected?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  disableDragging?: boolean;
  zIndex?: number;
  standardWidth?: number;
  standardHeight?: number;
  scale?: number;
}

const ResizableBox: React.FC<ResizableBoxProps> = ({ 
  x, y, width, height, 
  onDragStop, onResizeStop, 
  label, color = "purple",
  showDimensions = false,
  containerWidth, containerHeight,
  isSelected = false,
  onClick,
  children,
  disableDragging = false,
  zIndex = 10,
  standardWidth = 825,
  standardHeight = 1125,
  scale = 1
}) => {
  const pxX = (x / 100) * containerWidth;
  const pxY = (y / 100) * containerHeight;
  const pxW = (width / 100) * containerWidth;
  const pxH = typeof height === 'number' ? (height / 100) * containerHeight : 'auto';

  // Helper to map color names to tailwind classes
  const colorMap: Record<string, string> = {
    purple: 'blue',
    cyan: 'cyan',
    pink: 'pink',
    blue: 'blue',
    green: 'green'
  };
  const c = colorMap[color] || 'blue';

  return (
    <Rnd
      size={{ width: pxW, height: pxH as number | string }}
      position={{ x: pxX, y: pxY }}
      scale={scale}
      onDragStop={(e, d) => {
        if (disableDragging) return;
        const newX = (d.x / containerWidth) * 100;
        const newY = (d.y / containerHeight) * 100;
        onDragStop(newX, newY);
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        const newW = (parseFloat(ref.style.width) / containerWidth) * 100;
        const newH = (parseFloat(ref.style.height) / containerHeight) * 100;
        const newX = (position.x / containerWidth) * 100;
        const newY = (position.y / containerHeight) * 100;
        onResizeStop(newW, newH, newX, newY);
      }}
      bounds="parent"
      disableDragging={disableDragging}
      enableResizing={isSelected && !disableDragging}
      style={{ zIndex }}
      className={`group transition-colors ${isSelected ? `outline outline-2 outline-${c}-500 z-50` : `hover:outline hover:outline-1 hover:outline-${c}-500/50`}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick();
      }}
      handleStyles={isSelected ? undefined : { display: 'none' }} 
    >
      {/* Visual Bounding Box Indicator */}
      {isSelected && (
         <div className={`absolute inset-0 pointer-events-none border border-${c}-500 bg-${c}-500/5`}>
             <div className={`absolute -top-5 left-0 bg-${c}-500 text-white text-[10px] px-1 font-bold`}>
                {label}
             </div>
             {showDimensions && (
                <div className="absolute -bottom-5 right-0 bg-black/80 text-white text-[10px] px-1 tabular-nums">
                  {Math.round((pxW / containerWidth) * standardWidth)} x {Math.round((typeof pxH === 'number' ? pxH : 0 / containerHeight) * standardHeight)} px
                </div>
             )}
         </div>
      )}
      
      {children}
    </Rnd>
  );
};

export default ResizableBox;