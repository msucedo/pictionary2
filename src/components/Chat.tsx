import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/chat';

interface ChatProps {
  messages: ChatMessage[];
  currentPlayerId: string;
  currentPlayerName: string;
  isDrawing: boolean;
  onSendMessage: (message: string) => void;
  className?: string;
}

const Chat: React.FC<ChatProps> = ({
  messages,
  currentPlayerId,
  currentPlayerName,
  isDrawing,
  onSendMessage,
  className = ''
}) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !isDrawing) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageStyle = (message: ChatMessage) => {
    switch (message.type) {
      case 'system':
        return 'bg-blue-100 text-blue-800 italic text-center border border-blue-200';
      case 'correct_guess':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'guess':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'hint':
        return 'bg-purple-100 text-purple-800 border border-purple-300';
      default:
        return 'bg-gray-50 border border-gray-200';
    }
  };

  const getMessageIcon = (message: ChatMessage) => {
    switch (message.type) {
      case 'system':
        return '🤖';
      case 'correct_guess':
        return '✅';
      case 'guess':
        return '🤔';
      case 'hint':
        return '💡';
      default:
        return '💬';
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Chat Header */}
      <div className="p-3 bg-white border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 flex items-center">
          💬 Chat del Juego
          <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
            {messages.length} mensajes
          </span>
        </h3>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg ${getMessageStyle(message)}`}
          >
            {message.type === 'system' ? (
              <div className="text-center">
                <span className="text-sm">
                  {getMessageIcon(message)} {message.message}
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getMessageIcon(message)}</span>
                    <span className={`font-medium text-sm ${
                      message.playerId === currentPlayerId ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {message.playerName}
                      {message.playerId === currentPlayerId && ' (Tú)'}
                    </span>
                    {message.type === 'correct_guess' && (
                      <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                        ¡CORRECTO!
                      </span>
                    )}
                    {message.type === 'guess' && (
                      <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full">
                        INTENTO
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div className="text-sm text-gray-800">
                  {message.message}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isDrawing
                ? "No puedes chatear mientras dibujas"
                : "Escribe tu mensaje o respuesta..."
            }
            disabled={isDrawing}
            className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm ${
              isDrawing
                ? 'bg-gray-100 cursor-not-allowed text-gray-500'
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
            }`}
            maxLength={100}
          />
          <button
            type="submit"
            disabled={isDrawing || !newMessage.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDrawing || !newMessage.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Enviar
          </button>
        </form>

        {isDrawing && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            💡 Como eres el dibujante, no puedes enviar mensajes
          </p>
        )}

        {!isDrawing && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            💡 Envía una palabra para adivinar o un mensaje para chatear
          </p>
        )}
      </div>
    </div>
  );
};

export default Chat;