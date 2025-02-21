const UserService = require('../services/UserService');

describe('getProfileCustomization', () => {
  it('should return profile customization', async () => {
    const customization = await UserService.getProfileCustomization(client, userId);
    expect(customization).toHaveProperty('active_customizations');
    expect(customization).toHaveProperty('available_badges');
  });
}); 