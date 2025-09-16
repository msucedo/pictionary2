import React, { useEffect, useState } from 'react';
import { TurnTransition as TurnTransitionType, TurnResult } from '../types/room';

interface TurnTransitionProps {
  transition: TurnTransitionType;
  onTransitionComplete: () => void;
}

const TurnTransition: React.FC<TurnTransitionProps> = ({
  transition,
  onTransitionComplete
}) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onTransitionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTransitionComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 text-center">
        {/* Last Turn Result */}
        {transition.lastTurnResult && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Resultado del Turno</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center mb-3">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-lg font-bold">
                  🎨
                </div>
                <div className="ml-4 text-left">
                  <p className="font-semibold text-gray-800">
                    {transition.lastTurnResult.drawerName}
                  </p>
                  <p className="text-sm text-gray-600">Dibujó</p>
                </div>
              </div>

              <div className="text-center mb-3">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {transition.lastTurnResult.word}
                </div>
                <p className="text-sm text-gray-600">
                  Tiempo: {formatTime(transition.lastTurnResult.timeElapsed)}
                </p>
              </div>

              {transition.lastTurnResult.correctGuesses.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Adivinaron correctamente:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {transition.lastTurnResult.correctGuesses.map((guess, index) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {guess.playerName} (+{guess.pointsEarned})
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 italic">
                  Nadie adivinó la palabra
                </p>
              )}
            </div>
          </div>
        )}

        {/* Next Turn Info */}
        <div className="border-t pt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Siguiente Turno</h3>

          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
              {transition.nextDrawer.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-4 text-left">
              <p className="text-lg font-semibold text-gray-800">
                {transition.nextDrawer.name}
              </p>
              <p className="text-sm text-gray-600">Es tu turno para dibujar</p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Ronda {transition.round}</p>
            <p className="text-sm text-gray-600">Turno {transition.turnNumber}</p>
          </div>

          {/* Countdown */}
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {countdown}
            </div>
            <p className="text-sm text-gray-600">
              El juego continúa en...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TurnTransition;