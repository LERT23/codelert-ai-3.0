import React, { useState } from 'react';
import { Loader2, Download, Save } from 'lucide-react';
import { upscaleImage } from '../../services/geminiService.ts';

export const GeneratedImage: React.FC<{ src: string; alt: string; onSave: (src: string) => void }> = ({ src, alt, onSave }) => {
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleHdr = async () => {
    if (isUpscaling) return;
    setIsUpscaling(true);
    try {
      const base64Data = currentSrc.split(',')[1];
      const mimeType = currentSrc.split(';')[0].split(':')[1];
      const newSrc = await upscaleImage(base64Data, mimeType);
      setCurrentSrc(newSrc);
    } catch (e: any) {
      alert('Помилка покращення: ' + e.message);
    } finally {
      setIsUpscaling(false);
    }
  };

  return (
    <div className="my-4 p-3 bg-theme-panel rounded-xl border border-theme-border inline-block shadow-lg relative z-10 max-w-full">
      <img 
        src={currentSrc} 
        alt={alt} 
        className="max-w-full h-auto rounded-lg" 
      />
      <div className="flex flex-wrap gap-2 mt-3">
         <button onClick={handleHdr} disabled={isUpscaling} className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${isUpscaling ? 'bg-theme-muted text-theme-base' : 'bg-amber-600 text-white hover:bg-amber-500'}`}>
           {isUpscaling ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
           HDR (Upscale)
         </button>
         <a href={currentSrc} download="generated_image.jpg" className="px-3 py-1.5 bg-theme-base text-theme-muted hover:text-theme-text rounded text-sm font-bold transition-colors flex items-center gap-1">
           <Download size={14} /> Завантажити
         </a>
         <button onClick={() => onSave(currentSrc)} className="px-3 py-1.5 bg-theme-accent hover:bg-theme-accentHover text-white rounded text-sm font-bold transition-colors flex items-center gap-1">
           <Save size={14} /> Зберегти в проект
         </button>
      </div>
    </div>
  );
};
