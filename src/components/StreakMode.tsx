import React, { useState, useEffect } from 'react';
import { Button } from '@progress/kendo-react-buttons';
import { Card, CardHeader, CardTitle, CardBody } from '@progress/kendo-react-layout';
import { ProgressBar } from '@progress/kendo-react-progressbars';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { Notification, NotificationGroup } from '@progress/kendo-react-notification';
import { useGameSession } from '../hooks/useGameSession';
import { apiService } from '../services/api';

interface StreakModeProps {
  onNavigate: (page: 'home' | 'daily-mode' | 'streak-mode' | 'leaderboard' | 'admin') => void;
}

interface GameStats {
  currentStreak: number;
  lastStreak: number;
  bestStreak: number;
  totalScore: number;
  multiplier: number;
  lives: number;
}

const StreakMode: React.FC<StreakModeProps> = ({ onNavigate }) => {
  const { gameState: apiGameState, startGame, submitChoice, getNextRound, resetGame: apiResetGame, clearError } = useGameSession();
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const [timeLeft, setTimeLeft] = useState(30);
  const [stats, setStats] = useState<GameStats>({
    currentStreak: 0,
    lastStreak: 0,
    bestStreak: 0,
    totalScore: 0,
    multiplier: 1.0,
    lives: 3
  });
  const [showGameOver, setShowGameOver] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [selectedImage, setSelectedImage] = useState<'left' | 'right' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [aiImagePosition, setAiImagePosition] = useState<'left' | 'right'>('left');

  // Don't sync with API game state since we manage stats locally for lives system

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0) {
      handleTimeUp();
    }
  }, [gameState, timeLeft]);

  const handleStartGame = async () => {
    try {
      clearError();
      
      // Close game over dialog if it's open
      setShowGameOver(false);
      
      const playerId = 'streak-player-' + Date.now();
      await startGame('streak', playerId);
      setGameState('playing');
      setStats({
        currentStreak: 0,
        lastStreak: 0,
        bestStreak: Math.max(stats.bestStreak, stats.currentStreak),
        totalScore: 0,
        multiplier: 1.0,
        lives: 3
      });
      setTimeLeft(30);
      setSelectedImage(null);
      setShowResult(false);
      setRoundStartTime(Date.now());
      setIsAnswering(false);
      setNotification(null);
      // Randomize AI image position
      setAiImagePosition(Math.random() < 0.5 ? 'left' : 'right');
    } catch (error: any) {
      console.error('Failed to start streak game:', error);
      setNotification({
        message: 'Failed to start game: ' + error.message,
        type: 'error'
      });
    }
  };

  const handleImageSelect = async (choice: 'left' | 'right') => {
    if (selectedImage || showResult || !apiGameState.currentRound) return;
    
    setSelectedImage(choice);
    setIsAnswering(true);
    
    // Calculate response time
    const responseTime = Date.now() - roundStartTime;
    
    // The correct answer is always 'ai' (player should choose the AI image)
    // Check if the chosen side matches where the AI image is positioned
    const playerChoice: 'ai' | 'real' = choice === aiImagePosition ? 'ai' : 'real';
    
    try {
      const result = await submitChoice(playerChoice, responseTime);
      setShowResult(true);
      
      if (result.is_correct) {
        // Update local stats for correct answer
        setStats(prev => ({
          ...prev,
          currentStreak: prev.currentStreak + 1,
          totalScore: prev.totalScore + result.points_earned,
          multiplier: 1 + ((prev.currentStreak + 1) * 0.1)
        }));
        
        const newStreak = stats.currentStreak + 1;
        setNotification({
          message: `Correct! +${result.points_earned} points (${newStreak} streak)`,
          type: 'success'
        });
        
        setTimeout(() => {
          nextRound();
        }, 2000);
      } else {
        // Wrong answer - lose a life
        handleWrongAnswer();
      }
    } catch (error: any) {
      console.error('Failed to submit choice:', error);
      setNotification({
        message: 'Failed to submit choice: ' + error.message,
        type: 'error'
      });
      setIsAnswering(false);
      setSelectedImage(null);
    }
  };

  const nextRound = async () => {
    if (!apiGameState.gameCompleted) {
      try {
        await getNextRound();
        setTimeLeft(30 - Math.floor(stats.currentStreak / 5) * 2); // Decrease time as streak increases
        setSelectedImage(null);
        setShowResult(false);
        setRoundStartTime(Date.now());
        setIsAnswering(false);
        // Randomize AI image position for next round
        setAiImagePosition(Math.random() < 0.5 ? 'left' : 'right');
      } catch (error: any) {
        console.error('Failed to get next round:', error);
        // Game might be completed
      }
    }
  };

  const handleWrongAnswer = async () => {
    const newLives = stats.lives - 1;
    
    setStats(prev => ({
      ...prev,
      lives: newLives,
      lastStreak: prev.currentStreak,
      bestStreak: Math.max(prev.bestStreak, prev.currentStreak),
      currentStreak: 0,
      multiplier: 1.0
    }));

    if (newLives <= 0) {
      setNotification({
        message: 'Game Over! You\'re out of lives.',
        type: 'error'
      });
      setTimeout(() => {
        setGameState('gameOver');
        setShowGameOver(true);
      }, 2000);
    } else {
      setNotification({
        message: `Wrong! Lost a life. ${newLives} lives remaining.`,
        type: 'error'
      });
      
      // Start a new backend session for the next round since the backend ended the game
      setTimeout(async () => {
        try {
          const playerId = 'streak-player-' + Date.now();
          await startGame('streak', playerId);
          setSelectedImage(null);
          setShowResult(false);
          setRoundStartTime(Date.now());
          setIsAnswering(false);
          setTimeLeft(30 - Math.floor(stats.currentStreak / 5) * 2);
          // Randomize AI image position for restart
          setAiImagePosition(Math.random() < 0.5 ? 'left' : 'right');
        } catch (error: any) {
          console.error('Failed to restart game after life lost:', error);
          setNotification({
            message: 'Failed to continue game: ' + error.message,
            type: 'error'
          });
        }
      }, 2000);
    }
  };

  const handleTimeUp = () => {
    if (!showResult) {
      setNotification({
        message: 'Time\'s up! Lost a life.',
        type: 'error'
      });
      handleWrongAnswer();
    }
  };

  const resetGame = () => {
    setGameState('menu');
    setShowGameOver(false);
    setTimeLeft(30);
    setNotification(null);
    setSelectedImage(null);
    setShowResult(false);
    setIsAnswering(false);
    apiResetGame();
  };

  const getDifficultyLevel = () => {
    if (stats.currentStreak < 5) return 'Easy';
    if (stats.currentStreak < 15) return 'Medium';
    return 'Hard';
  };

  const getStreakColor = () => {
    if (stats.currentStreak < 5) return '#28a745';
    if (stats.currentStreak < 15) return '#ffc107';
    return '#dc3545';
  };

  if (gameState === 'menu') {
    return (
      <div className="streak-mode-page">
        <div className="game-container">
          <Button
            fillMode="flat"
            onClick={() => onNavigate('home')}
            className="back-button"
          >
            🏠 Back to Home
          </Button>
          
          <div className="game-page-header">
            <h1>🔥 <span className="gradient-text">Streak Mode</span></h1>
            <p>Keep playing until you fail! How many can you spot in a row?</p>
            {apiGameState.error && (
              <div className="game-error">
                Error: {apiGameState.error}
                <button onClick={clearError}>
                  Dismiss
                </button>
              </div>
            )}
          </div>
          <Card>
            <CardBody>
              <div className="game-menu">
                <div className="game-stats-preview">
                  <div className="stat-item">
                    <span className="stat-label">Best Streak</span>
                    <span className="stat-value">{stats.bestStreak}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">High Score</span>
                    <span className="stat-value">{stats.totalScore.toLocaleString()}</span>
                  </div>
                </div>

                <div className="game-rules">
                  <h3>🎯 How to Play</h3>
                  <ul>
                    <li>🤖 Click on the AI-generated image in each pair</li>
                    <li>⏱️ You have 30 seconds per round (decreases with streak)</li>
                    <li>🔥 Build your streak for higher multipliers</li>
                    <li>❤️ You have 3 lives - lose one for each mistake or timeout</li>
                    <li>🎮 Game ends when you lose all 3 lives</li>
                    <li>📈 Difficulty increases as your streak grows</li>
                  </ul>
                </div>

                <Button
                  themeColor="primary"
                  size="large"
                  onClick={handleStartGame}
                  className="start-game-btn"
                  disabled={apiGameState.isLoading}
                >
                  {apiGameState.isLoading ? 'Starting...' : '🚀 Start Streak Challenge'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="streak-mode-page">
      <div className="game-container streak-playing">
        <Button
          fillMode="flat"
          onClick={resetGame}
          className="back-button"
        >
          🏠 Back to Menu
        </Button>
        
        <div className="game-page-header">
          <h1>🔥 <span className="gradient-text">Streak Mode</span></h1>
          <p>Find the AI-generated image!</p>
          {apiGameState.error && (
            <div className="game-error">
              Error: {apiGameState.error}
              <button onClick={clearError}>
                Dismiss
              </button>
            </div>
          )}
        </div>
        {/* Game Stats */}
        <div className="game-stats">
          <Card>
            <CardBody>
              <div className="stats-row">
                <div className="stat-item">
                  <span className="stat-label">Streak</span>
                  <span className="stat-value" style={{ color: getStreakColor() }}>
                    {stats.currentStreak}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Score</span>
                  <span className="stat-value">{stats.totalScore.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Lives</span>
                  <span className="stat-value">
                    {'❤️'.repeat(stats.lives)}{'🖤'.repeat(3 - stats.lives)}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Difficulty</span>
                  <span className="stat-value">{getDifficultyLevel()}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Timer - Only show when not showing results */}
        {!showResult && (
          <Card>
            <CardBody>
              <div className="timer-section">
                <div className="timer-label">Time Remaining</div>
                <ProgressBar 
                  value={(timeLeft / 30) * 100}
                  className={timeLeft <= 5 ? 'timer-critical' : timeLeft <= 10 ? 'timer-warning' : ''}
                />
                <div className="timer-value">{timeLeft}s</div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Game Images */}
        {apiGameState.currentRound && gameState === 'playing' && (
          <div className="streak-game-card">
            <Card>
              <CardHeader>
                <CardTitle>Which image is AI-generated?</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="image-pair-centered">
                  <div 
                    className={`image-option ${selectedImage === 'left' ? 'selected' : ''} ${isAnswering ? 'disabled' : ''} ${showResult ? (aiImagePosition === 'left' ? 'ai-revealed' : 'real-revealed') : ''}`}
                    onClick={() => handleImageSelect('left')}
                  >
                    <div className="image-container">
                      <img 
                        src={apiService.getImageUrl(aiImagePosition === 'left' ? apiGameState.currentRound.pair.ai_image.id : apiGameState.currentRound.pair.real_image.id)}
                        alt={aiImagePosition === 'left' ? apiGameState.currentRound.pair.ai_image.filename : apiGameState.currentRound.pair.real_image.filename}
                        className="game-image"
                        onError={(e) => {
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
                    className={`image-option ${selectedImage === 'right' ? 'selected' : ''} ${isAnswering ? 'disabled' : ''} ${showResult ? (aiImagePosition === 'right' ? 'ai-revealed' : 'real-revealed') : ''}`}
                    onClick={() => handleImageSelect('right')}
                  >
                    <div className="image-container">
                      <img 
                        src={apiService.getImageUrl(aiImagePosition === 'right' ? apiGameState.currentRound.pair.ai_image.id : apiGameState.currentRound.pair.real_image.id)}
                        alt={aiImagePosition === 'right' ? apiGameState.currentRound.pair.ai_image.filename : apiGameState.currentRound.pair.real_image.filename}
                        className="game-image"
                        onError={(e) => {
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
                <div className="game-hint">
                  <p>💡 Tip: Look for unnatural details, inconsistent lighting, or artifacts that might indicate AI generation.</p>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Multiplier Info */}
        <Card>
          <CardBody>
            <div className="multiplier-info">
              <span>Current Multiplier: </span>
              <span className="multiplier-value">×{stats.multiplier.toFixed(1)}</span>
              <span className="multiplier-next">
                (Next: ×{(1 + ((stats.currentStreak + 1) * 0.1)).toFixed(1)})
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Game Over Dialog */}
      {showGameOver && (
        <Dialog 
          title="🔥 Streak Ended!" 
          onClose={() => setShowGameOver(false)}
        >
        <div className="game-over-content">
          <div className="final-stats">
            <h3>Final Results</h3>
            <div className="final-stat">
              <span>Last Streak:</span>
              <span>{stats.lastStreak}</span>
            </div>
            <div className="final-stat">
              <span>Best Streak:</span>
              <span>{stats.bestStreak}</span>
            </div>
            <div className="final-stat">
              <span>Total Score:</span>
              <span>{stats.totalScore.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <DialogActionsBar>
          <Button onClick={handleStartGame} themeColor="primary">
            🔄 Play Again
          </Button>
          <Button onClick={() => onNavigate('leaderboard')}>
            🏆 View Leaderboard
          </Button>
          <Button onClick={resetGame}>
            🏠 Back to Menu
          </Button>
        </DialogActionsBar>
        </Dialog>
      )}

      {/* Notifications */}
      {notification && (
        <NotificationGroup
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000
          }}
        >
          <Notification
            type={{ style: notification.type, icon: true }}
            closable={true}
            onClose={() => setNotification(null)}
          >
            <span>{notification.message}</span>
          </Notification>
        </NotificationGroup>
      )}
    </div>
  );
};

export default StreakMode;