import React from 'react';
import { GameResults as GameResultsType, Player } from '../types/room';

interface GameResultsProps {
  results: GameResultsType;
  currentPlayer: Player;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

const GameResults: React.FC<GameResultsProps> = ({
  results,
  currentPlayer,
  onPlayAgain,
  onBackToMenu
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRankIcon = (position: number): string => {
    switch (position) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🏅';
    }
  };

  const getRankColor = (position: number): string => {
    switch (position) {
      case 0: return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 1: return 'bg-gray-100 border-gray-400 text-gray-800';
      case 2: return 'bg-orange-100 border-orange-400 text-orange-800';
      default: return 'bg-blue-100 border-blue-400 text-blue-800';
    }
  };

  const currentPlayerPosition = results.finalScores.findIndex(p => p.id === currentPlayer.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-600 p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ¡Juego Terminado!
          </h1>
          {results.winner && (
            <p className="text-lg text-gray-600">
              Ganador: <span className="font-semibold text-yellow-600">{results.winner.name}</span>
            </p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Tiempo total: {formatTime(results.totalTime)}
          </p>
        </div>

        {/* Player Performance */}
        {currentPlayerPosition !== -1 && (
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2 text-center">Tu Resultado</h3>
            <div className="flex items-center justify-center">
              <span className="text-2xl mr-3">{getRankIcon(currentPlayerPosition)}</span>
              <div>
                <p className="font-semibold text-blue-800">
                  Posición: {currentPlayerPosition + 1}° lugar
                </p>
                <p className="text-blue-600">
                  Puntuación: {currentPlayer.score} puntos
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Final Leaderboard */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
            Clasificación Final
          </h3>
          <div className="space-y-3">
            {results.finalScores.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  player.id === currentPlayer.id
                    ? 'bg-blue-100 border-blue-400'
                    : getRankColor(index)
                }`}
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-4">{getRankIcon(index)}</span>
                  <div>
                    <p className="font-semibold">
                      {player.name}
                      {player.id === currentPlayer.id && ' (Tú)'}
                    </p>
                    <p className="text-sm opacity-75">
                      {index + 1}° lugar
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{player.score}</p>
                  <p className="text-sm opacity-75">puntos</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Statistics */}
        <div className="mb-8 bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Estadísticas del Juego</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total de turnos:</p>
              <p className="font-semibold">{results.turnResults.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Palabras dibujadas:</p>
              <p className="font-semibold">{results.turnResults.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Tiempo promedio por turno:</p>
              <p className="font-semibold">
                {results.turnResults.length > 0
                  ? formatTime(Math.floor(results.totalTime / results.turnResults.length))
                  : '0:00'
                }
              </p>
            </div>
            <div>
              <p className="text-gray-600">Jugadores:</p>
              <p className="font-semibold">{results.finalScores.length}</p>
            </div>
          </div>
        </div>

        {/* Turn Results Summary */}
        {results.turnResults.length > 0 && (
          <div className="mb-8">
            <h4 className="font-semibold text-gray-800 mb-3">Resumen de Turnos</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {results.turnResults.map((turn, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div>
                    <p className="font-medium">{turn.drawerName}</p>
                    <p className="text-gray-600">{turn.word}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600">{formatTime(turn.timeElapsed)}</p>
                    <p className="text-xs text-gray-500">
                      {turn.correctGuesses.length} aciertos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={onPlayAgain}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            🔄 Jugar de Nuevo
          </button>
          <button
            onClick={onBackToMenu}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            🏠 Menú Principal
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameResults;