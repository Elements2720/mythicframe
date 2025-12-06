
import React, { forwardRef } from 'react';
import ResizableBox from '../ui/ResizableBox';
import { CardLayout, LayoutElement } from '../../types';

interface FullCardCanvasProps {
  cardLayout: CardLayout;
  updateLayout: (key: keyof CardLayout, field: keyof LayoutElement, value: any) => void;
  selectedLayoutElement: keyof CardLayout | null;
  setSelectedLayoutElement: (key: keyof CardLayout | null) => void;
  generatedImage: string | null;
  templateImage: string | null;
  cardName: string;
  cardMana: string;
  cardEffects: string;
  cardType?: string;
}

const FullCardCanvas = forwardRef<HTMLDivElement, FullCardCanvasProps>(({
  cardLayout, updateLayout, selectedLayoutElement, setSelectedLayoutElement,
  generatedImage, templateImage, cardName, cardMana, cardEffects, cardType
}, ref) => {
  const PREVIEW_HEIGHT = 650;
  const PREVIEW_WIDTH = PREVIEW_HEIGHT * 0.733; // Standard Card Ratio

  const containerW = PREVIEW_WIDTH;
  const containerH = PREVIEW_HEIGHT;

  return (
      <div 
        className="flex-1 bg-slate-950 relative flex items-center justify-center p-8 overflow-auto"
        onClick={() => setSelectedLayoutElement(null)} 
      >
        <div 
          ref={ref}
          className="relative bg-black shadow-2xl rounded-lg overflow-hidden border border-slate-800"
          style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* --- LAYER 1: TEMPLATE --- */}
          {templateImage ? (
            <img 
              src={templateImage} 
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
              alt="Template"
            />
          ) : (
            <div className="absolute inset-0 border-4 border-slate-800 flex items-center justify-center z-0 pointer-events-none opacity-30">
              <span className="text-slate-500">No Template</span>
            </div>
          )}

          {/* --- LAYER 2: ART (Variable Z) --- */}
          <ResizableBox
            x={cardLayout.art.x}
            y={cardLayout.art.y}
            width={cardLayout.art.width}
            height={cardLayout.art.height!}
            containerWidth={containerW}
            containerHeight={containerH}
            isSelected={selectedLayoutElement === 'art'}
            label="Art Area"
            onClick={() => setSelectedLayoutElement('art')}
            onDragStop={(x:number, y:number) => { updateLayout('art', 'x', x); updateLayout('art', 'y', y); }}
            onResizeStop={(w:number, h:number) => { updateLayout('art', 'width', w); updateLayout('art', 'height', h); }}
            zIndex={cardLayout.art.zIndex === 'behind' ? 1 : 20}
          >
             <div className="w-full h-full relative overflow-hidden bg-slate-900/50 group-hover:bg-slate-900/30">
                {generatedImage ? (
                  <img 
                    src={generatedImage} 
                    className="absolute max-w-none pointer-events-none"
                    style={{
                       width: '100%',
                       height: '100%',
                       objectFit: 'cover',
                       transform: `scale(${cardLayout.art.imageScale || 1}) translate(${cardLayout.art.imageOffsetX || 0}%, ${cardLayout.art.imageOffsetY || 0}%)`
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-slate-600 text-[10px]">
                    Art Placeholder
                  </div>
                )}
             </div>
          </ResizableBox>


          {/* --- LAYER 3: TEXT ELEMENTS --- */}
          <ResizableBox
            x={cardLayout.name.x}
            y={cardLayout.name.y}
            width={cardLayout.name.width}
            height="auto"
            containerWidth={containerW}
            containerHeight={containerH}
            isSelected={selectedLayoutElement === 'name'}
            label="Name"
            onClick={() => setSelectedLayoutElement('name')}
            onDragStop={(x:number, y:number) => { updateLayout('name', 'x', x); updateLayout('name', 'y', y); }}
            onResizeStop={(w:number) => updateLayout('name', 'width', w)}
            zIndex={30}
          >
             <div 
               className="w-full text-center font-bold whitespace-nowrap overflow-hidden text-ellipsis px-1"
               style={{
                 fontSize: `${cardLayout.name.fontSize}px`,
                 color: cardLayout.name.color,
                 textShadow: cardLayout.name.textShadow || '0 2px 4px rgba(0,0,0,0.8)',
                 fontFamily: cardLayout.name.fontFamily || 'serif'
               }}
             >
               {cardName || "Card Name"}
             </div>
          </ResizableBox>

          {/* Type Line */}
          <ResizableBox
            x={cardLayout.type.x}
            y={cardLayout.type.y}
            width={cardLayout.type.width}
            height="auto"
            containerWidth={containerW}
            containerHeight={containerH}
            isSelected={selectedLayoutElement === 'type'}
            label="Type"
            onClick={() => setSelectedLayoutElement('type')}
            onDragStop={(x:number, y:number) => { updateLayout('type', 'x', x); updateLayout('type', 'y', y); }}
            onResizeStop={(w:number) => updateLayout('type', 'width', w)}
            zIndex={30}
          >
             <div 
               className="w-full text-center font-bold whitespace-nowrap overflow-hidden text-ellipsis px-1"
               style={{
                 fontSize: `${cardLayout.type.fontSize}px`,
                 color: cardLayout.type.color,
                 textShadow: cardLayout.type.textShadow || '0 1px 2px rgba(0,0,0,0.8)',
                 fontFamily: cardLayout.type.fontFamily || 'sans-serif'
               }}
             >
               {cardType || "Type - Subtype"}
             </div>
          </ResizableBox>

          <ResizableBox
            x={cardLayout.mana.x}
            y={cardLayout.mana.y}
            width={cardLayout.mana.width}
            height="auto"
            containerWidth={containerW}
            containerHeight={containerH}
            isSelected={selectedLayoutElement === 'mana'}
            label="Mana"
            onClick={() => setSelectedLayoutElement('mana')}
            onDragStop={(x:number, y:number) => { updateLayout('mana', 'x', x); updateLayout('mana', 'y', y); }}
            onResizeStop={(w:number) => updateLayout('mana', 'width', w)}
            zIndex={30}
          >
             <div 
               className="w-full text-center font-bold"
               style={{
                 fontSize: `${cardLayout.mana.fontSize}px`,
                 color: cardLayout.mana.color,
                 textShadow: cardLayout.mana.textShadow || '0 2px 4px rgba(0,0,0,0.8)',
                 fontFamily: cardLayout.mana.fontFamily || 'serif'
               }}
             >
               {cardMana || "0"}
             </div>
          </ResizableBox>

          <ResizableBox
            x={cardLayout.description.x}
            y={cardLayout.description.y}
            width={cardLayout.description.width}
            height="auto"
            containerWidth={containerW}
            containerHeight={containerH}
            isSelected={selectedLayoutElement === 'description'}
            label="Desc"
            onClick={() => setSelectedLayoutElement('description')}
            onDragStop={(x:number, y:number) => { updateLayout('description', 'x', x); updateLayout('description', 'y', y); }}
            onResizeStop={(w:number) => updateLayout('description', 'width', w)}
            zIndex={30}
          >
             <div 
               className="w-full text-center leading-snug break-words px-1"
               style={{
                 fontSize: `${cardLayout.description.fontSize}px`,
                 color: cardLayout.description.color,
                 textShadow: cardLayout.description.textShadow || '0 1px 2px rgba(0,0,0,0.8)',
                 fontFamily: cardLayout.description.fontFamily || 'sans-serif'
               }}
             >
               {cardEffects || "Card description..."}
             </div>
          </ResizableBox>

        </div>
      </div>
  );
});

export default FullCardCanvas;
