import React, { useState, useEffect } from 'react';
import { Button } from '@progress/kendo-react-buttons';
import { Card, CardHeader, CardTitle, CardBody } from '@progress/kendo-react-layout';
import { ProgressBar } from '@progress/kendo-react-progressbars';
import { useGameSession } from '../hooks/useGameSession';
import { apiService } from '../services/api';

interface DailyModeProps {
  onNavigate: (page: 'home' | 'daily-mode' | 'streak-mode' | 'leaderboard' | 'admin') => void;
}

const DailyMode: React.FC<DailyModeProps> = ({ onNavigate }) => {
  const { gameState, startGame, submitChoice, getNextRound, clearError } = useGameSession();
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [selectedImage, setSelectedImage] = useState<'left' | 'right' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [aiImagePosition, setAiImagePosition] = useState<'left' | 'right'>('left');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const completed = localStorage.getItem(`daily-completed-${today}`);
    if (completed) {
      setIsCompleted(true);
    }
  }, []);

  useEffect(() => {
    let timer: number;
    if (gameState.gameStarted && !gameState.gameCompleted && timeRemaining > 0 && !showResult) {
      timer = window.setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && gameState.gameStarted && !showResult) {
      handleTimeUp();
    }
    return () => clearTimeout(timer);
  }, [timeRemaining, gameState.gameStarted, gameState.gameCompleted, showResult]);

  const handleStartGame = async () => {
    if (isCompleted) {
      alert('You have already completed today\'s challenge!');
      return;
    }
    
    try {
      clearError();
      const playerId = 'player-' + Date.now(); // Simple player ID for demo
      await startGame('daily', playerId);
      setTimeRemaining(30);
      setSelectedImage(null);
      setShowResult(false);
      setRoundStartTime(Date.now());
      // Randomize AI image position
      setAiImagePosition(Math.random() < 0.5 ? 'left' : 'right');
    } catch (error: any) {
      console.error('Failed to start game:', error);
      alert('Failed to start game: ' + error.message);
    }
  };

  const handleImageSelect = async (choice: 'left' | 'right') => {
    if (selectedImage || showResult || !gameState.currentRound) return;
    
    setSelectedImage(choice);
    
    // Calculate response time
    const responseTime = Date.now() - roundStartTime;
    
    // The correct answer is always 'ai' (player should choose the AI image)
    // Check if the chosen side matches where the AI image is positioned
    const playerChoice: 'ai' | 'real' = choice === aiImagePosition ? 'ai' : 'real';
    
    try {
      const result = await submitChoice(playerChoice, responseTime);
      setShowResult(true);
      
      // If game completed, update completion status
      if (result.game_completed) {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`daily-completed-${today}`, 'true');
        setIsCompleted(true);
      }
    } catch (error: any) {
      console.error('Failed to submit choice:', error);
      alert('Failed to submit choice: ' + error.message);
    }
  };  
  const nextRound = async () => {
    if (!gameState.gameCompleted) {
      try {
        await getNextRound();
        setTimeRemaining(30);
        setSelectedImage(null);
        setShowResult(false);
        setRoundStartTime(Date.now());
        // Randomize AI image position for next round
        setAiImagePosition(Math.random() < 0.5 ? 'left' : 'right');
      } catch (error: any) {
        console.error('Failed to get next round:', error);
        // Game might be completed
      }
    }
  };

  const handleTimeUp = () => {
    if (!showResult) {
      handleImageSelect('left');
    }
  };



  return (
    <div className="daily-mode-page">
      <div className="game-container">
        <Button
          fillMode="flat"
          onClick={() => onNavigate('home')}
          className="back-button"
        >
          🏠 Back to Home
        </Button>
        
        <div className="game-page-header">
          <h1>📅 <span className="gradient-text">Daily Mode</span></h1>
          <p>Play 3 rounds daily and build your streak!</p>
          {gameState.error && (
            <div className="game-error">
              Error: {gameState.error}
              <button onClick={clearError}>
                Dismiss
              </button>
            </div>
          )}
        </div>
        {!gameState.gameStarted && !gameState.gameCompleted && (
          <Card>
            <CardBody>
              <div className="game-intro">
                <h2>🎯 Today's Challenge</h2>
                <p>Can you spot the AI-generated images? You have 3 rounds to prove your skills!</p>
                
                <div className="challenge-info">
                  <div className="info-item">
                    <span className="info-icon">🎮</span>
                    <span>3 rounds per day</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">⏱️</span>
                    <span>30 seconds per round</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">🏆</span>
                    <span>Earn points based on speed</span>
                  </div>
                </div>

                {isCompleted ? (
                  <div className="completed-challenge">
                    <h3>✅ Challenge Completed!</h3>
                    <p>Come back tomorrow for a new challenge!</p>
                    <Button
                      themeColor="info"
                      onClick={() => onNavigate('leaderboard')}
                    >
                      View Leaderboard
                    </Button>
                  </div>
                ) : (
                  <div className="start-section">
                    <Button
                      themeColor="primary"
                      size="large"
                      onClick={handleStartGame}
                      disabled={gameState.isLoading}
                    >
                      {gameState.isLoading ? 'Starting...' : 'Start Daily Challenge'}
                    </Button>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}     
        {gameState.gameStarted && !gameState.gameCompleted && (
          <div className="game-active">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="game-header">
                    <span>Round {(gameState.currentRound?.round_number || 1)} of 3</span>
                    <span className="timer">⏱️ {timeRemaining}s</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="progress-section">
                  <ProgressBar 
                    value={(gameState.roundsCompleted / 3) * 100} 
                    labelVisible={false}
                  />
                  <div className="score-display">Score: {gameState.totalScore}</div>
                </div>

                <div className="round-content">
                  <h3>Which image is AI-generated?</h3>
                  <p>Click on the image you think was created by AI</p>
                  
                  {gameState.currentRound && (
                    <div className="image-selection">
                      <div 
                        className={`image-option ${selectedImage === 'left' ? 'selected' : ''} ${showResult ? (aiImagePosition === 'left' ? 'ai-revealed' : 'real-revealed') : ''}`}
                        onClick={() => handleImageSelect('left')}
                      >
                        <div className="image-container">
                          <img 
                            src={apiService.getImageUrl(aiImagePosition === 'left' ? gameState.currentRound.pair.ai_image.id : gameState.currentRound.pair.real_image.id)}
                            alt={aiImagePosition === 'left' ? gameState.currentRound.pair.ai_image.filename : gameState.currentRound.pair.real_image.filename}
                            className="game-image"
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              e.currentTarget.style.display = 'none';
                              const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                              if (nextElement) nextElement.style.display = 'flex';
                            }}
                          />
                          <div className="image-fallback" style={{ display: 'none' }}>
                            <span className="image-icon">🖼️</span>
                            <span className="image-label">Image A</span>
                          </div>
                          {showResult && (
                            <div className="image-reveal">
                              <span className={`reveal-badge ${aiImagePosition === 'left' ? 'ai-badge' : 'real-badge'}`}>
                                {aiImagePosition === 'left' ? '🤖 AI Generated' : '📷 Real Photo'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="vs-divider">VS</div>

                      <div 
                        className={`image-option ${selectedImage === 'right' ? 'selected' : ''} ${showResult ? (aiImagePosition === 'right' ? 'ai-revealed' : 'real-revealed') : ''}`}
                        onClick={() => handleImageSelect('right')}
                      >
                        <div className="image-container">
                          <img 
                            src={apiService.getImageUrl(aiImagePosition === 'right' ? gameState.currentRound.pair.ai_image.id : gameState.currentRound.pair.real_image.id)}
                            alt={aiImagePosition === 'right' ? gameState.currentRound.pair.ai_image.filename : gameState.currentRound.pair.real_image.filename}
                            className="game-image"
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              e.currentTarget.style.display = 'none';
                              const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                              if (nextElement) nextElement.style.display = 'flex';
                            }}
                          />
                          <div className="image-fallback" style={{ display: 'none' }}>
                            <span className="image-icon">🖼️</span>
                            <span className="image-label">Image B</span>
                          </div>
                          {showResult && (
                            <div className="image-reveal">
                              <span className={`reveal-badge ${aiImagePosition === 'right' ? 'ai-badge' : 'real-badge'}`}>
                                {aiImagePosition === 'right' ? '🤖 AI Generated' : '📷 Real Photo'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {showResult && (
                    <div className="round-result">
                      <Button
                        themeColor="primary"
                        onClick={nextRound}
                        disabled={gameState.isLoading}
                      >
                        {gameState.roundsCompleted < 2 ? 'Next Round' : 'Last Round'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        )}  
        {gameState.gameCompleted && (
          <Card>
            <CardBody>
              <div className="game-results">
                <div className="final-score">
                  {(() => {
                    const accuracy = gameState.final_stats ? Math.round(gameState.final_stats.accuracy_percentage) : 0;
                    
                    // Determine icon based on performance
                    let icon = '🎉';
                    
                    if (accuracy >= 100) {
                      icon = '🏆';
                    } else if (accuracy >= 67) {
                      icon = '🎉';
                    } else if (accuracy >= 50) {
                      icon = '👍';
                    } else if (accuracy >= 25) {
                      icon = '📈';
                    } else {
                      icon = '💪';
                    }
                    
                    return <h2>{icon} Daily Challenge Complete!</h2>;
                  })()}
                  
                  <div className="score-display">
                    <span className="score-label">Final Score</span>
                    <span className="score-value">{gameState.totalScore}</span>
                  </div>
                  <div className="accuracy-display">
                    <span className="accuracy-label">Accuracy</span>
                    <span className={`accuracy-value ${(() => {
                      const accuracy = gameState.final_stats ? Math.round(gameState.final_stats.accuracy_percentage) : 0;
                      if (accuracy >= 67) return 'accuracy-excellent';
                      if (accuracy >= 50) return 'accuracy-good';
                      if (accuracy >= 25) return 'accuracy-fair';
                      return 'accuracy-poor';
                    })()}`}>
                      {gameState.final_stats ? Math.round(gameState.final_stats.accuracy_percentage) : 0}%
                    </span>
                  </div>
                </div>

                <div className="completion-actions">
                  <Button
                    themeColor="primary"
                    onClick={() => onNavigate('leaderboard')}
                  >
                    View Leaderboard
                  </Button>
                  <Button
                    fillMode="outline"
                    onClick={() => onNavigate('home')}
                  >
                    Back to Home
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DailyMode;