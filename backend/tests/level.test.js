const LevelService = require('../services/LevelService');

describe('getCompetitorProgress', () => {
  it('should return competitor progress', async () => {
    const progress = await LevelService.getCompetitorProgress(client, competitorId);
    expect(progress).toHaveProperty('stats');
    expect(progress).toHaveProperty('progression');
  });
}); 