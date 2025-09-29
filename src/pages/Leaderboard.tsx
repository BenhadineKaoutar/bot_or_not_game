import React, { useState } from 'react';
import { Button } from '@progress/kendo-react-buttons';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Card, CardHeader, CardTitle, CardBody } from '@progress/kendo-react-layout';
import { Chart, ChartSeries, ChartSeriesItem, ChartCategoryAxis, ChartCategoryAxisItem } from '@progress/kendo-react-charts';
import { DropDownList } from '@progress/kendo-react-dropdowns';

interface LeaderboardProps {
  onNavigate: (page: 'home' | 'daily-mode' | 'streak-mode' | 'leaderboard' | 'admin') => void;
}

interface Player {
  id: number;
  rank: number;
  username: string;
  totalScore: number;
  dailyStreak: number;
  bestStreak: number;
  gamesPlayed: number;
  accuracy: number;
  lastActive: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onNavigate }) => {
  // Sample leaderboard data
  const [players] = useState<Player[]>([
    { id: 1, rank: 1, username: 'AIDetector_Pro', totalScore: 15420, dailyStreak: 12, bestStreak: 45, gamesPlayed: 156, accuracy: 94.2, lastActive: '2025-09-25' },
    { id: 2, rank: 2, username: 'BotSpotter_99', totalScore: 14850, dailyStreak: 8, bestStreak: 38, gamesPlayed: 142, accuracy: 91.8, lastActive: '2025-09-25' },
    { id: 3, rank: 3, username: 'RealOrFake_Master', totalScore: 13920, dailyStreak: 15, bestStreak: 42, gamesPlayed: 134, accuracy: 89.5, lastActive: '2025-09-24' },
    { id: 4, rank: 4, username: 'ImageAnalyst_X', totalScore: 12750, dailyStreak: 5, bestStreak: 28, gamesPlayed: 128, accuracy: 87.3, lastActive: '2025-09-25' },
    { id: 5, rank: 5, username: 'PixelPerfect', totalScore: 11680, dailyStreak: 3, bestStreak: 35, gamesPlayed: 119, accuracy: 85.7, lastActive: '2025-09-23' },
    { id: 6, rank: 6, username: 'TruthSeeker_AI', totalScore: 10920, dailyStreak: 7, bestStreak: 31, gamesPlayed: 112, accuracy: 84.1, lastActive: '2025-09-25' },
    { id: 7, rank: 7, username: 'DeepFake_Hunter', totalScore: 10150, dailyStreak: 2, bestStreak: 26, gamesPlayed: 105, accuracy: 82.8, lastActive: '2025-09-24' },
    { id: 8, rank: 8, username: 'Visual_Validator', totalScore: 9580, dailyStreak: 4, bestStreak: 29, gamesPlayed: 98, accuracy: 81.2, lastActive: '2025-09-25' }
  ]);

  const [timeFilter, setTimeFilter] = useState('all-time');
  const timeFilterOptions = [
    { text: 'All Time', value: 'all-time' },
    { text: 'This Month', value: 'month' },
    { text: 'This Week', value: 'week' },
    { text: 'Today', value: 'today' }
  ];

  // Chart data for top 5 players
  const chartData = players.slice(0, 5).map(player => ({
    category: player.username,
    value: player.totalScore
  }));

  const getRankBadge = (rank: number) => {
    const badges = { 1: '🥇', 2: '🥈', 3: '🥉' };
    return badges[rank as keyof typeof badges] || `#${rank}`;
  };

  const RankCell = (props: any) => {
    return (
      <td className="rank-cell">
        <span className="rank-badge">{getRankBadge(props.dataItem.rank)}</span>
      </td>
    );
  };

  const UsernameCell = (props: any) => {
    return (
      <td className="username-cell">
        <div className="player-info">
          <span className="username">{props.dataItem.username}</span>
          <span className="last-active">Last active: {new Date(props.dataItem.lastActive).toLocaleDateString()}</span>
        </div>
      </td>
    );
  };

  const ScoreCell = (props: any) => {
    return (
      <td className="score-cell">
        <span className="score-value">{props.dataItem.totalScore.toLocaleString()}</span>
      </td>
    );
  };

  const AccuracyCell = (props: any) => {
    return (
      <td className="accuracy-cell">
        <span className={`accuracy-value ${props.dataItem.accuracy >= 90 ? 'high' : props.dataItem.accuracy >= 80 ? 'medium' : 'low'}`}>
          {props.dataItem.accuracy}%
        </span>
      </td>
    );
  };

  return (
    <div className="leaderboard-page">
      <div className="page-header">
        <Button
          fillMode="flat"
          onClick={() => onNavigate('home')}
          className="back-button"
        >
          🏠 Back to Home
        </Button>
        <h1>🏆 Leaderboard</h1>
        <p>See how you rank against other players</p>
      </div>

      <div className="leaderboard-container">
        {/* Top Players Podium */}
        <div className="podium-section">
          <Card>
            <CardHeader>
              <CardTitle>🏆 Top Players</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="podium">
                {players.slice(0, 3).map((player, index) => (
                  <div key={player.id} className={`podium-place place-${index + 1}`}>
                    <div className="podium-rank">{getRankBadge(player.rank)}</div>
                    <div className="podium-username">{player.username}</div>
                    <div className="podium-score">{player.totalScore.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Statistics Cards */}
        <div className="stats-section">
          <Card>
            <CardHeader>
              <CardTitle>📊 Top Scores Chart</CardTitle>
            </CardHeader>
            <CardBody>
              <Chart style={{ height: '300px' }}>
                <ChartCategoryAxis>
                  <ChartCategoryAxisItem categories={chartData.map(d => d.category)} />
                </ChartCategoryAxis>
                <ChartSeries>
                  <ChartSeriesItem 
                    type="column" 
                    data={chartData.map(d => d.value)}
                    name="Total Score"
                    color="#667eea"
                  />
                </ChartSeries>
              </Chart>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🎯 Quick Stats</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="quick-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Players</span>
                  <span className="stat-value">{players.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Highest Score</span>
                  <span className="stat-value">{Math.max(...players.map(p => p.totalScore)).toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Best Streak</span>
                  <span className="stat-value">{Math.max(...players.map(p => p.bestStreak))}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg Accuracy</span>
                  <span className="stat-value">{(players.reduce((sum, p) => sum + p.accuracy, 0) / players.length).toFixed(1)}%</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Leaderboard Table */}
        <div className="leaderboard-table">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="table-header">
                  <span>Full Leaderboard</span>
                  <DropDownList
                    data={timeFilterOptions}
                    textField="text"
                    dataItemKey="value"
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.value)}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Grid
                data={players}
                autoProcessData={true}
                sortable={true}
                pageable={true}
                pageSize={10}
              >
                <GridColumn 
                  field="rank" 
                  title="Rank" 
                  width="80px"
                  cells={{ data: RankCell }}
                />
                <GridColumn 
                  field="username" 
                  title="Player" 
                  width="200px"
                  cells={{ data: UsernameCell }}
                />
                <GridColumn 
                  field="totalScore" 
                  title="Total Score" 
                  width="120px"
                  cells={{ data: ScoreCell }}
                />
                <GridColumn 
                  field="dailyStreak" 
                  title="Daily Streak" 
                  width="100px"
                />
                <GridColumn 
                  field="bestStreak" 
                  title="Best Streak" 
                  width="100px"
                />
                <GridColumn 
                  field="gamesPlayed" 
                  title="Games" 
                  width="80px"
                />
                <GridColumn 
                  field="accuracy" 
                  title="Accuracy" 
                  width="100px"
                  cells={{ data: AccuracyCell }}
                />
              </Grid>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;