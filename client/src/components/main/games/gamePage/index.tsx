import React from 'react';
import './index.css';
import NimGamePage from '../nimGamePage';
import useGamePage from '../../../../hooks/useGamePage';

/**
 * Component to display the game page for a specific game type, including controls and game state.
 * @returns A React component rendering:
 * - A header with the game title and current game status.
 * - A "Leave Game" button to exit the current game.
 * - The game component specific to the game type (e.g., `NimGamePage` for "Nim").
 * - An error message if an error occurs during the game.
 */
const GamePage = () => {
  const { gameState, error, handleLeaveGame } = useGamePage();

  /**
   * Renders the appropriate game component based on the game type.
   * @param gameType The type of the game to render (e.g., "Nim").
   * @returns A React component corresponding to the specified game type, or a
   * fallback message for unknown types.
   */
  const renderGameComponent = (gameType: string) => {
    if (!gameState) return <div>Loading game...</div>; // or handle it however you want

    switch (gameType.toUpperCase()) {
      case 'NIM':
        return <NimGamePage gameState={gameState} />;
      default:
        return <div>Unsupported game type: {gameType}</div>;
    }
  };

  return (
    <div className='game-page'>
      <header className='game-header'>
        <h1>{gameState ? `${gameState.gameType} Game` : 'Loading...'}</h1>
        <p className='game-status'>Status: {gameState ? gameState.state.status : 'Not started'}</p>
      </header>

      <div className='game-controls'>
        <button className='btn-leave-game' onClick={handleLeaveGame}>
          Leave Game
        </button>
      </div>

      {error && (
        <div className='game-error'>
          <p>Error: {error}</p>
        </div>
      )}

      {gameState ? renderGameComponent(gameState.gameType) : <p>Loading game data...</p>}
    </div>
  );
};

export default GamePage;
