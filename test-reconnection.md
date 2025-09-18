# Test Plan: Reconexión Automática

## Pasos para probar la funcionalidad de reconexión:

### 1. **Iniciar servidores**
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
npm start
```

### 2. **Crear room y verificar persistencia**
1. Crear una nueva sala
2. Agregar un segundo jugador desde otra pestaña/incognito
3. **Verificar en localStorage:**
   - `pictionary_room_id`
   - `pictionary_player_id`

### 3. **Probar reconexión automática**
1. Con 2 jugadores en lobby
2. **Refrescar la página** del host (F5)
3. **Verificar que:**
   - El socket se reconecta automáticamente
   - El jugador se reune a la room
   - La UI se restaura al lobby
   - Los logs muestran: `🔄 Attempting to rejoin room`

### 4. **Probar gameStart después de reconexión**
1. Después de la reconexión exitosa
2. Host presiona "Iniciar Juego"
3. **Verificar que:**
   - Los logs muestren room membership: `🏠 DEBUGGING: Socket rooms before gameStart`
   - El evento `gameStart` llegue al servidor
   - El juego inicie correctamente

### 5. **Logs esperados en consola del frontend:**
```
🔄 Socket reconnected, attempting to rejoin room...
🔄 Attempting to rejoin room: {roomId: "...", playerId: "..."}
✅ Successfully rejoined room
🏠 DEBUGGING: Socket rooms before gameStart: Set {"room-id"}
🚀 EMITTING gameStart NOW!!!
✅ Successfully emitted gameStart event
```

### 6. **Logs esperados en consola del servidor:**
```
🔄 Player attempting to rejoin: player-id to room: room-id
✅ Updated player Player Name socket ID from reconnection
✅ Player Player Name successfully rejoined room ABCD
🎯 GAME START EVENT RECEIVED from socket: socket-id
🎮 Starting game in room ABCD...
✅ Game started successfully! Room status: playing
```

## ✅ Indicadores de éxito:
- [ ] Reconexión automática funciona
- [ ] Room membership persiste después de reconexión
- [ ] gameStart funciona después de reconexión
- [ ] No hay errores en consola
- [ ] localStorage se actualiza correctamente