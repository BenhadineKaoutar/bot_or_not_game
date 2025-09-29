export class ScoreCalculator {
  private readonly BASE_SCORE = 100;
  private readonly DIFFICULTY_MULTIPLIER = 20;
  private readonly MAX_TIME_BONUS = 50;
  private readonly STREAK_BONUS_MULTIPLIER = 0.1;

  public calculateScore(
    isCorrect: boolean,
    responseTime: number, // in milliseconds
    difficulty: number, // 1-5
    currentStreak: number = 0
  ): number {
    if (!isCorrect) {
      return 0;
    }

    // Base score
    let score = this.BASE_SCORE;

    // Difficulty bonus
    const difficultyBonus = difficulty * this.DIFFICULTY_MULTIPLIER;
    score += difficultyBonus;

    // Time bonus (faster response = higher bonus)
    // Assuming 30 seconds max time, convert ms to seconds
    const responseTimeSeconds = Math.min(responseTime / 1000, 30);
    const timeBonus = Math.max(0, this.MAX_TIME_BONUS - (responseTimeSeconds * 2));
    score += timeBonus;

    // Streak multiplier
    const streakMultiplier = 1 + (currentStreak * this.STREAK_BONUS_MULTIPLIER);
    score *= streakMultiplier;

    // Round to nearest integer
    return Math.floor(score);
  }

  public calculateDailyScore(rounds: Array<{
    isCorrect: boolean;
    responseTime: number;
    difficulty: number;
  }>): {
    totalScore: number;
    roundScores: number[];
    bonusPoints: number;
  } {
    const roundScores = rounds.map((round, index) => 
      this.calculateScore(round.isCorrect, round.responseTime, round.difficulty, 0)
    );

    const totalScore = roundScores.reduce((sum, score) => sum + score, 0);
    
    // Perfect game bonus (all 3 correct)
    const perfectGameBonus = rounds.every(round => round.isCorrect) ? 100 : 0;
    
    // Speed bonus (average response time under 10 seconds)
    const averageResponseTime = rounds.reduce((sum, round) => sum + round.responseTime, 0) / rounds.length / 1000;
    const speedBonus = averageResponseTime < 10 ? 50 : 0;

    const bonusPoints = perfectGameBonus + speedBonus;

    return {
      totalScore: totalScore + bonusPoints,
      roundScores,
      bonusPoints
    };
  }

  public calculateStreakScore(
    isCorrect: boolean,
    responseTime: number,
    difficulty: number,
    currentStreak: number
  ): {
    baseScore: number;
    difficultyBonus: number;
    timeBonus: number;
    streakMultiplier: number;
    finalScore: number;
  } {
    const baseScore = this.BASE_SCORE;
    const difficultyBonus = difficulty * this.DIFFICULTY_MULTIPLIER;
    const responseTimeSeconds = Math.min(responseTime / 1000, 30);
    const timeBonus = Math.max(0, this.MAX_TIME_BONUS - (responseTimeSeconds * 2));
    const streakMultiplier = 1 + (currentStreak * this.STREAK_BONUS_MULTIPLIER);

    const finalScore = isCorrect 
      ? Math.floor((baseScore + difficultyBonus + timeBonus) * streakMultiplier)
      : 0;

    return {
      baseScore,
      difficultyBonus,
      timeBonus,
      streakMultiplier,
      finalScore
    };
  }

  public getDifficultyFromStreak(streak: number): number {
    if (streak < 5) return 1;
    if (streak < 10) return 2;
    if (streak < 15) return 3;
    if (streak < 20) return 4;
    return 5;
  }

  public getStreakMultiplier(streak: number): number {
    return 1 + (streak * this.STREAK_BONUS_MULTIPLIER);
  }

  public calculateRank(score: number, allScores: number[]): {
    rank: number;
    percentile: number;
    totalPlayers: number;
  } {
    const sortedScores = allScores.sort((a, b) => b - a);
    const rank = sortedScores.findIndex(s => s <= score) + 1;
    const percentile = ((allScores.length - rank + 1) / allScores.length) * 100;

    return {
      rank,
      percentile: Math.round(percentile * 100) / 100,
      totalPlayers: allScores.length
    };
  }
}