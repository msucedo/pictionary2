import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import socketService from '../services/socketService';
import { DrawingEvent } from '../types/room';

interface Point {
  x: number;
  y: number;
}

interface DrawingCanvasProps {
  canDraw?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export interface DrawingCanvasRef {
  clearCanvas: () => void;
  getCanvasData: () => string | null;
  setCanvasData: (data: string) => void;
}

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({
  canDraw = true,
  width = 600,
  height = 400,
  className = ""
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const saveCanvasState = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = canvasHistory.slice(0, historyStep + 1);
    newHistory.push(imageData);
    setCanvasHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [canvasHistory, historyStep]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;

    // Save initial canvas state
    if (canvasHistory.length === 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setCanvasHistory([imageData]);
      setHistoryStep(0);
    }
  }, [currentColor, brushSize, canvasHistory.length, saveCanvasState]);

  // WebSocket drawing events listener
  useEffect(() => {
    if (!canDraw) {
      // Only viewers listen to drawing events
      const handleDrawingUpdate = (drawingEvent: DrawingEvent) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        switch (drawingEvent.type) {
          case 'start':
            if (drawingEvent.x !== undefined && drawingEvent.y !== undefined) {
              ctx.strokeStyle = drawingEvent.color || '#000000';
              ctx.lineWidth = drawingEvent.size || 2;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.beginPath();
              ctx.moveTo(drawingEvent.x, drawingEvent.y);
              setLastPoint({ x: drawingEvent.x, y: drawingEvent.y });
            }
            break;

          case 'draw':
            if (drawingEvent.x !== undefined && drawingEvent.y !== undefined && lastPoint) {
              ctx.beginPath();
              ctx.moveTo(lastPoint.x, lastPoint.y);
              ctx.lineTo(drawingEvent.x, drawingEvent.y);
              ctx.stroke();
              setLastPoint({ x: drawingEvent.x, y: drawingEvent.y });
            }
            break;

          case 'end':
            setLastPoint(null);
            saveCanvasState();
            break;
        }
      };

      const handleDrawingClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveCanvasState();
      };

      socketService.onDrawingUpdate(handleDrawingUpdate);
      socketService.onDrawingClear(handleDrawingClear);

      return () => {
        socketService.offDrawingUpdate(handleDrawingUpdate);
        socketService.offDrawingClear(handleDrawingClear);
      };
    }
  }, [canDraw, lastPoint, saveCanvasState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
  }, [currentColor, brushSize]);

  const getPointFromEvent = (event: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ('touches' in event) {
      const touch = event.touches[0] || event.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    if (!canDraw) return;
    event.preventDefault();
    setIsDrawing(true);
    const point = getPointFromEvent(event);
    setLastPoint(point);

    // Send drawing start event via WebSocket
    socketService.startDrawing(point.x, point.y, currentColor, brushSize);
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!canDraw) return;
    event.preventDefault();
    if (!isDrawing || !lastPoint) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const currentPoint = getPointFromEvent(event);

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    setLastPoint(currentPoint);

    // Send drawing event via WebSocket
    socketService.draw(currentPoint.x, currentPoint.y);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      saveCanvasState();
      // Send drawing end event via WebSocket
      if (canDraw) {
        socketService.endDrawing();
      }
    }
    setIsDrawing(false);
    setLastPoint(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();

    // Send clear event via WebSocket if user can draw
    if (canDraw) {
      socketService.clearDrawing();
    }
  };

  const getCanvasData = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL();
  };

  const setCanvasData = (data: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      saveCanvasState();
    };
    img.src = data;
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clearCanvas,
    getCanvasData,
    setCanvasData
  }));

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      setHistoryStep(historyStep - 1);
      const imageData = canvasHistory[historyStep - 1];
      ctx.putImageData(imageData, 0, 0);
    }
  };

  const redo = () => {
    if (historyStep < canvasHistory.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      setHistoryStep(historyStep + 1);
      const imageData = canvasHistory[historyStep + 1];
      ctx.putImageData(imageData, 0, 0);
    }
  };

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB',
    '#A52A2A', '#808080', '#FFFFFF'
  ];

  return (
    <div className={`flex flex-col w-full h-full ${className}`}>
      {/* Toolbar - Only show when user can draw */}
      {canDraw && (
        <div className="mb-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Color Picker Row */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Color:</span>
              <div className="flex gap-1">
                {colors.slice(0, 8).map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      currentColor === color
                        ? 'border-gray-800 scale-110'
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="w-6 h-6 rounded border border-gray-300"
              />
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Pincel:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-500 w-8">{brushSize}px</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={historyStep <= 0}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                historyStep <= 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              ↶ Deshacer
            </button>
            <button
              onClick={redo}
              disabled={historyStep >= canvasHistory.length - 1}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                historyStep >= canvasHistory.length - 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              ↷ Rehacer
            </button>
            <button
              onClick={clearCanvas}
              className="px-3 py-1 text-sm bg-red-500 text-white font-medium rounded hover:bg-red-600 transition-colors"
            >
              🗑️ Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`border-2 bg-white rounded-lg shadow-sm ${
            canDraw
              ? 'border-blue-300 cursor-crosshair'
              : 'border-gray-300 cursor-default'
          }`}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Status indicator for viewers */}
      {!canDraw && (
        <div className="mt-2 text-center text-sm text-gray-500">
          👁️ Modo espectador - Esperando que el dibujante comience...
        </div>
      )}
    </div>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;