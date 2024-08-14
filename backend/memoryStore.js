const store = {
  users: new Map(),
  competitors: new Map(),
};

module.exports = {
  setUser: (userId, userData) => store.users.set(userId, userData),
  getUser: (userId) => store.users.get(userId),
  setCompetitor: (userId, competitorData) => store.competitors.set(userId, competitorData),
  getCompetitor: (userId) => store.competitors.get(userId),
};
