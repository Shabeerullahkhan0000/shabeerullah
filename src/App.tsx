import React, { useState, useCallback, useRef } from 'react';
import { UploadCloud, Layers, Maximize, ZoomIn, ZoomOut, X, Loader2, Moon, Sun, Info } from 'lucide-react';
import { DxfViewerComponent } from './components/DxfViewerComponent';
import type { DxfViewer } from 'dxf-viewer';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  
  const [viewer, setViewer] = useState<DxfViewer | null>(null);
  const [layers, setLayers] = useState<Array<{name: string, color: number, visible: boolean}>>([]);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovering(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.toLowerCase().endsWith('.dxf')) {
        handleFileSelection(droppedFile);
      } else {
        alert("Please upload a .dxf file.");
      }
    }
  }, []);

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    setViewer(null);
    setLayers([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };
  
  const handleLoadStart = () => {
    setIsLoading(true);
    setLoadingPhase('Starting...');
    setLoadingProgress(0);
  };
  
  const handleLoadProgress = (phase: string, loaded: number, total: number | null) => {
    setLoadingPhase(phase);
    if (total && total > 0) {
      setLoadingProgress(Math.round((loaded / total) * 100));
    } else {
      setLoadingProgress((prev) => (prev < 90 ? prev + 5 : prev)); // Fake progress for unknown bounds
    }
  };

  const handleLoadEnd = (loadedViewer: DxfViewer | null) => {
    setIsLoading(false);
    setViewer(loadedViewer);
    
    if (loadedViewer) {
      // Intialize layer list
      const sceneLayers = Array.from(loadedViewer.GetLayers());
      const formattedLayers = sceneLayers.map((l: any) => ({
        name: l.name,
        color: l.color,
        visible: true // All are visible by default
      }));
      // Sort alphabetically, with 0 layer usually at the top
      formattedLayers.sort((a,b) => a.name.localeCompare(b.name));
      setLayers(formattedLayers);
    }
  };

  const toggleLayer = (layerName: string) => {
    if (!viewer) return;
    
    setLayers(prev => prev.map(l => {
      if (l.name === layerName) {
        const newVisible = !l.visible;
        viewer.ShowLayer(layerName, newVisible);
        viewer.Render();
        return { ...l, visible: newVisible };
      }
      return l;
    }));
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!viewer) return;
    
    const controls = (viewer as any).controls;
    if (controls) {
      // For OrbitControls
      const zoomFactor = direction === 'in' ? 1.5 : 1/1.5;
      controls.object.zoom *= zoomFactor;
      controls.object.updateProjectionMatrix();
      controls.update();
      viewer.Render();
    }
  };

  const handleFit = () => {
    if (!viewer) return;
    const bounds = viewer.GetBounds();
    if (bounds) {
      viewer.FitView(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, 0.1);
    }
  };

  return (
    <div className={`w-screen h-screen flex flex-col font-sans transition-colors duration-300 ${isDarkTheme ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-900'}`}>
      
      {!file && (
        <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-12">
          <div 
            className={`w-full max-w-2xl h-96 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 transition-all
              ${isHovering ? 'border-blue-500 bg-blue-50/10' : (isDarkTheme ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-300 bg-white')}
              shadow-xl`}
            onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
            onDragLeave={() => setIsHovering(false)}
            onDrop={handleDrop}
          >
            <div className={`p-5 rounded-full mb-6 ${isDarkTheme ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
              <UploadCloud size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">Upload DXF Drawing</h2>
            <p className={`text-center mb-8 max-w-sm leading-relaxed ${isDarkTheme ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Drag and drop your CAD drawing here, or click to browse. Optimized for very large files.
            </p>
            <label className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full cursor-pointer transition-colors shadow-lg shadow-blue-500/30">
              Select DXF File
              <input type="file" className="hidden" accept=".dxf" onChange={handleFileChange} />
            </label>
          </div>
          
          <button 
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className="absolute top-6 right-6 p-3 rounded-full bg-neutral-800 text-white shadow-xl hover:scale-105 transition-transform"
          >
            {isDarkTheme ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      )}

      {file && (
        <div className="relative flex-1 w-full h-full overflow-hidden">
          {/* Main Viewer */}
          <DxfViewerComponent 
            file={file}
            isDarkTheme={isDarkTheme}
            onLoadStart={handleLoadStart}
            onLoadProgress={handleLoadProgress}
            onLoadEnd={handleLoadEnd}
            onError={(e) => { alert('Failed to load drawing. Check console for details.'); setIsLoading(false); }}
          />
          
          {/* Loading Overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-50 text-white"
              >
                <Loader2 className="animate-spin mb-6" size={48} />
                <h3 className="text-xl tracking-tight font-medium mb-2">Analyzing Drawing...</h3>
                <div className="flex flex-col items-center gap-2">
                   <div className="w-64 bg-white/20 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
                   </div>
                   <p className="text-sm font-mono opacity-80 uppercase tracking-widest">{phaseLabel(loadingPhase)} • {loadingProgress}%</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Setup top left panel (File Info) */}
          <AnimatePresence>
            {viewer && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-4 left-4 sm:top-6 sm:left-6 flex flex-col gap-2 z-10"
              >
                <div className={`flex items-center gap-3 pr-6 rounded-full shadow-lg border backdrop-blur-xl
                  ${isDarkTheme ? 'bg-neutral-800/80 border-neutral-700 text-white' : 'bg-white/80 border-neutral-200 text-neutral-900'}
                `}>
                  <button 
                    onClick={() => setFile(null)} 
                    className="p-3 hover:bg-red-500/10 hover:text-red-500 text-neutral-500 rounded-full transition-colors flex-shrink-0"
                    title="Close file"
                  >
                    <X size={20} />
                  </button>
                  <div className="flex flex-col py-2 overflow-hidden">
                    <span className="font-semibold text-sm truncate max-w-[150px] sm:max-w-xs">{file.name}</span>
                    <span className="text-[10px] uppercase tracking-wide opacity-60">DXF Format • {(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Setup bottom right controls (Zoom/Fit/Layers) */}
          <AnimatePresence>
            {viewer && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 right-6 flex flex-col gap-3 z-10"
              >
                {/* Layers button */}
                <div className="relative">
                   {layersMenuOpen && (
                     <div className={`absolute bottom-full right-0 mb-3 w-64 sm:w-72 max-h-96 overflow-y-auto rounded-2xl shadow-2xl border backdrop-blur-xl p-2
                       ${isDarkTheme ? 'bg-neutral-800/95 border-neutral-700 text-white shadow-black/50' : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-900/10'}
                     `}>
                       <div className="sticky top-0 pb-2 mb-2 border-b border-neutral-500/20 px-3 pt-2 text-sm font-bold flex justify-between items-center backdrop-blur bg-transparent">
                          Layers ({layers.length})
                       </div>
                       <div className="flex flex-col gap-1">
                          {layers.length > 0 ? layers.map(layer => (
                            <button
                               key={layer.name}
                               onClick={() => toggleLayer(layer.name)}
                               className={`flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-sm font-medium
                                  ${isDarkTheme ? 'hover:bg-neutral-700/50' : 'hover:bg-neutral-100'}
                                  ${layer.visible ? '' : 'opacity-40'}
                               `}
                            >
                               <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: `#${layer.color.toString(16).padStart(6, '0')}` }} />
                               <span className="truncate">{layer.name}</span>
                            </button>
                          )) : (
                            <span className="p-3 text-sm opacity-50 italic">No explicit layers active</span>
                          )}
                       </div>
                     </div>
                   )}
                   <button 
                     onClick={() => setLayersMenuOpen(!layersMenuOpen)}
                     className={`w-12 h-12 flex items-center justify-center rounded-2xl shadow-lg border backdrop-blur-xl transition-all
                        ${layersMenuOpen ? 'bg-blue-600 border-blue-500 text-white rounded-tr-sm' : 
                         isDarkTheme ? 'bg-neutral-800/80 border-neutral-700 text-white hover:bg-neutral-700' : 'bg-white/80 border-neutral-200 text-neutral-900 hover:bg-white'}
                     `}
                     title="Layers"
                   >
                     <Layers size={22} />
                   </button>
                </div>
                
                {/* View Controls Group */}
                <div className={`flex flex-col rounded-2xl shadow-lg border backdrop-blur-xl overflow-hidden
                  ${isDarkTheme ? 'bg-neutral-800/80 border-neutral-700 text-white' : 'bg-white/80 border-neutral-200 text-neutral-900'}
                `}>
                  <button 
                    onClick={() => handleZoom('in')}
                    className={`w-12 h-12 flex items-center justify-center transition-colors border-b
                      ${isDarkTheme ? 'hover:bg-neutral-700 border-neutral-700' : 'hover:bg-neutral-100 border-neutral-200'}
                    `}
                    title="Zoom In"
                  >
                    <ZoomIn size={22} />
                  </button>
                  <button 
                    onClick={() => handleFit()}
                    className={`w-12 h-12 flex items-center justify-center transition-colors border-b
                      ${isDarkTheme ? 'hover:bg-neutral-700 border-neutral-700' : 'hover:bg-neutral-100 border-neutral-200'}
                    `}
                    title="Fit to Screen"
                  >
                    <Maximize size={20} />
                  </button>
                  <button 
                    onClick={() => handleZoom('out')}
                    className={`w-12 h-12 flex items-center justify-center transition-colors
                      ${isDarkTheme ? 'hover:bg-neutral-700' : 'hover:bg-neutral-100'}
                    `}
                    title="Zoom Out"
                  >
                    <ZoomOut size={22} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Top Right interaction tip */}
          {viewer && (
             <div className="absolute top-6 right-6 hidden md:flex items-center gap-2 bg-black/40 backdrop-blur px-4 py-2 rounded-full text-white text-xs tracking-wide uppercase shadow-lg pointer-events-none">
                <Info size={14}/> Pan: Drag • Zoom: Scroll
             </div>
          )}
        </div>
      )}
    </div>
  );
}

function phaseLabel(phase: string) {
  if (phase === 'fetch') return 'Downloading';
  if (phase === 'parse') return 'Parsing Geometries';
  return phase;
}
