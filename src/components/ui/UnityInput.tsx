
import React, { useState, useRef, useEffect } from 'react';

interface UnityInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  sensitivity?: number; // How fast the value changes when dragging
  icon?: string;
  suffix?: string;
}

const UnityInput: React.FC<UnityInputProps> = ({
  label,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  sensitivity = 0.5,
  icon,
  suffix = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  
  // Refs to track drag state without closure staleness
  const dragStartRef = useRef<{ x: number, startVal: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingValueRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString());
    }
  }, [value, isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, startVal: value };
    
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragStartRef.current) return;
    
    const deltaX = e.clientX - dragStartRef.current.x;
    
    // Unity-style modifiers: Shift = Fast (10x), Alt = Slow (0.1x)
    const multiplier = e.shiftKey ? 10 : (e.altKey ? 0.1 : 1);
    
    const change = deltaX * step * sensitivity * multiplier;
    
    let newValue = dragStartRef.current.startVal + change;
    
    // Clamp
    newValue = Math.min(Math.max(newValue, min), max);
    
    // Round to step precision to avoid floating point weirdness
    if (step < 1) {
        const factor = 1 / step;
        newValue = Math.round(newValue * factor) / factor;
    } else {
        newValue = Math.round(newValue);
    }

    pendingValueRef.current = newValue;
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (pendingValueRef.current !== null) {
          onChange(pendingValueRef.current);
        }
        rafIdRef.current = null;
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingValueRef.current !== null) {
      onChange(pendingValueRef.current);
      pendingValueRef.current = null;
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    let newValue = parseFloat(inputValue);
    if (isNaN(newValue)) {
      newValue = value;
    } else {
      newValue = Math.min(Math.max(newValue, min), max);
    }
    onChange(newValue);
    setInputValue(newValue.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  return (
    <div className={`flex items-center bg-slate-950 rounded border ${isDragging ? 'border-purple-500 ring-1 ring-purple-500/30' : 'border-slate-800 hover:border-slate-600'} overflow-hidden text-xs transition-all group`}>
      {/* Draggable Label */}
      <div 
        className={`flex items-center gap-2 px-2 py-1.5 cursor-ew-resize select-none bg-slate-900 border-r border-slate-800 text-slate-400 hover:text-purple-400 transition-colors min-w-[30%]`}
        onMouseDown={handleMouseDown}
        title="Drag to adjust (Shift=Fast, Alt=Slow)"
      >
        {icon && <i className={`fa-solid ${icon} text-[10px]`} />}
        <span className={`font-medium truncate ${isDragging ? 'text-purple-400' : ''}`}>{label}</span>
      </div>

      {/* Value Input */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={isDragging ? value : inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsEditing(true)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent px-2 py-1.5 text-slate-200 outline-none font-mono text-right ${isDragging ? 'cursor-ew-resize text-purple-300' : ''}`}
        />
        {suffix && !isEditing && (
            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none group-hover:text-slate-500">
                {suffix}
            </span>
        )}
      </div>
    </div>
  );
};

export default UnityInput;
