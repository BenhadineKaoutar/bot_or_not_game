import React, { useState } from 'react';
import { Button, ButtonGroup } from '@progress/kendo-react-buttons';
import { Card, CardHeader, CardTitle, CardBody } from '@progress/kendo-react-layout';
import { starIcon, clockIcon } from '@progress/kendo-svg-icons';

interface LandingPageProps {
  onNavigate: (page: 'home' | 'daily-mode' | 'streak-mode' | 'leaderboard' | 'admin') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [showDialogue, setShowDialogue] = useState(false);

  const handleCloseDialogue = () => {
    setShowDialogue(false);
  };

  const handleShowDialogue = () => {
    setShowDialogue(true);
  };
  const handleDailyModeClick = () => {
    onNavigate('daily-mode');
  };

  const handleStreakModeClick = () => {
    onNavigate('streak-mode');
  };

  const handleLeaderboardClick = () => {
    onNavigate('leaderboard');
  };



  return (
    <div className="landing-page">
      <div className="hero-section">
        {/* Botgy Section */}
        {showDialogue ? (
          /* Botgy with Dialogue */
          <div className="botgy-intro">
            <div className="botgy-container">
              <img 
                src="/botgy.svg" 
                alt="Botgy - Your AI Detection Host" 
                className="botgy-character"
              />
              <div className="botgy-speech">
                <div className="speech-bubble">
                  <button 
                    className="close-dialogue-btn"
                    onClick={handleCloseDialogue}
                    aria-label="Close dialogue"
                    type="button"
                  >
                    ✕
                  </button>
                  <p>👋 Hey there! I'm <strong>Botgy</strong>, your AI detection host! Think you can tell the difference between real and AI-generated images? Let's find out! 🤖✨</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Botgy Centered Above Title */
          <div className="botgy-centered">
            <img 
              src="/botgy.svg" 
              alt="Botgy - Your AI Detection Host" 
              className="botgy-character-centered"
              onClick={handleShowDialogue}
              title="Click to see Botgy's greeting again!"
            />
          </div>
        )}

        <h1>Bot or Not</h1>
        <p className="subtitle">Can you spot the AI-generated images? Test your skills with Botgy!</p>
        
        <div className="game-modes">
          <ButtonGroup className="mint-button-group">
            <Button
              className="mint-primary-btn"
              themeColor="primary"
              size="large"
              svgIcon={clockIcon}
              onClick={handleDailyModeClick}
            >
              Daily Mode
            </Button>
            <Button
              className="mint-secondary-btn"
              themeColor="secondary"
              size="large"
              svgIcon={starIcon}
              onClick={handleStreakModeClick}
            >
              Streak Mode
            </Button>
            <Button
              className="mint-info-btn"
              themeColor="info"
              size="large"
              onClick={handleLeaderboardClick}
            >
              🏆 Leaderboard
            </Button>
          </ButtonGroup>
        </div>

        <div className="features-grid">
          <Card 
            className="clickable-card"
            onClick={handleDailyModeClick}
          >
            <CardHeader>
              <CardTitle>📅 Daily Mode</CardTitle>
            </CardHeader>
            <CardBody>
              <p>Play 3 rounds daily. Spot the AI-generated image in each pair. Build your daily streak!</p>
            </CardBody>
          </Card>
          <Card 
            className="clickable-card"
            onClick={handleStreakModeClick}
          >
            <CardHeader>
              <CardTitle>🔥 Streak Mode</CardTitle>
            </CardHeader>
            <CardBody>
              <p>Keep playing until you fail! How many AI images can you spot in a row?</p>
            </CardBody>
          </Card>
          <Card 
            className="clickable-card"
            onClick={handleLeaderboardClick}
          >
            <CardHeader>
              <CardTitle>🏆 Leaderboard</CardTitle>
            </CardHeader>
            <CardBody>
              <p>See how you rank against other players. Compete for the top spot!</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;