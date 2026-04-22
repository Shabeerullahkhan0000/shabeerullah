import React, { useEffect, useRef, useState } from 'react';
import { DxfViewer } from 'dxf-viewer';
import * as THREE from 'three';

export interface DxfViewerComponentProps {
  file: File | null;
  onLoadStart?: () => void;
  onLoadProgress?: (phase: string, loaded: number, total: number | null) => void;
  onLoadEnd?: (viewer: DxfViewer | null) => void;
  onError?: (err: Error) => void;
  isDarkTheme?: boolean;
}

export function DxfViewerComponent({
  file,
  onLoadStart,
  onLoadProgress,
  onLoadEnd,
  onError,
  isDarkTheme = true
}: DxfViewerComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<DxfViewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize viewer
    const viewer = new DxfViewer(containerRef.current, {
      autoResize: true,
      clearColor: new THREE.Color(isDarkTheme ? "#1e1e1e" : "#f5f5f5"),
      colorCorrection: true,
      blackWhiteInversion: true,
    });
    viewerRef.current = viewer;

    return () => {
      viewer.Destroy();
      viewerRef.current = null;
    };
  }, [isDarkTheme]); // Re-create if theme drastically changes (or we could just change clearColor)

  useEffect(() => {
    if (!file || !viewerRef.current) return;

    let isCancelled = false;
    const url = URL.createObjectURL(file);

    const loadDxf = async () => {
      try {
        if (onLoadStart) onLoadStart();
        
        await viewerRef.current!.Load({
          url,
          workerFactory: () => new Worker(new URL('../dxf-worker.ts', import.meta.url), { type: 'module' }),
          progressCbk: (phase, loaded, total) => {
            if (isCancelled) return;
            if (onLoadProgress) onLoadProgress(phase, loaded, total);
          }
        });

        if (isCancelled) return;

        // Fire load end which provides the viewer to the parent
        if (onLoadEnd) onLoadEnd(viewerRef.current);
        
        // Ensure proper framing after layout stabilizes
        if (viewerRef.current) {
          const frameDoc = () => {
             const bounds = viewerRef.current?.GetBounds();
             if (bounds) {
                viewerRef.current?.FitView(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, 0.1);
             }
          };
          
          // Try a few times to ensure the container has reached its final layout dimensions
          setTimeout(frameDoc, 100);
          setTimeout(frameDoc, 500);
          setTimeout(frameDoc, 1000);
        }

      } catch (err: any) {
        console.error("Dxf load error", err);
        if (!isCancelled && onError) onError(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    loadDxf();

    return () => {
      isCancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full cursor-crosshair overflow-hidden touch-none"
    />
  );
}
