/**
 * @module schemas
 * @description Joi validation schemas for request validation across the application
 * @requires joi
 */

const Joi = require('joi');

/**
 * @constant {Object} commonSchemas
 * @description Common reusable validation schemas
 * @property {Joi.Schema} uuid - UUID string validation
 * @property {Joi.Schema} timestamp - ISO timestamp validation
 * @property {Object} pagination - Pagination parameters validation
 * @property {Joi.Schema} email - Email address validation
 * @property {Joi.Schema} url - URL string validation
 * @property {Joi.Schema} hexColor - Hex color code validation
 * @property {Joi.Schema} boolean - Boolean value validation
 */
const commonSchemas = {
  uuid: Joi.string().uuid(),
  timestamp: Joi.date().iso(),
  pagination: {
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
  },
  email: Joi.string().email().max(100),
  url: Joi.string().uri(),
  hexColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
  boolean: Joi.boolean()
};

/**
 * @constant {Object} enums
 * @description Validation schemas for enumerated values
 * @property {Joi.Schema} userRole - User role validation (USER, MANAGER, ADMIN, GAMEMASTER)
 * @property {Joi.Schema} competitionType - Competition type validation (INDIVIDUAL, TEAM, LEAGUE, TOURNAMENT)
 * @property {Joi.Schema} recurrencePattern - Recurrence pattern validation (DAILY, WEEKLY, MONTHLY, YEARLY)
 * @property {Joi.Schema} notificationType - Notification type validation (ACHIEVEMENT, CHALLENGE, BADGE, SYSTEM)
 * @property {Joi.Schema} kpiAggregation - KPI aggregation method validation (SUM, AVERAGE, MAX, MIN, COUNT)
 * @property {Joi.Schema} tradeStatus - Trade status validation (PENDING, ACCEPTED, REJECTED, CANCELLED, COMPLETED)
 * @property {Joi.Schema} friendStatus - Friend status validation (PENDING, ACCEPTED, BLOCKED)
 * @property {Joi.Schema} questStatus - Quest status validation (AVAILABLE, IN_PROGRESS, COMPLETED, FAILED)
 * @property {Joi.Schema} rarityLevel - Item rarity validation (COMMON, UNCOMMON, RARE, EPIC, LEGENDARY)
 * @property {Joi.Schema} shopType - Shop type validation (GENERAL, PREMIUM, EVENT, SEASONAL)
 */
const enums = {
  userRole: Joi.string().valid('USER', 'MANAGER', 'ADMIN', 'GAMEMASTER'),
  competitionType: Joi.string().valid('INDIVIDUAL', 'TEAM', 'LEAGUE', 'TOURNAMENT'),
  recurrencePattern: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'),
  notificationType: Joi.string().valid('ACHIEVEMENT', 'CHALLENGE', 'BADGE', 'SYSTEM'),
  kpiAggregation: Joi.string().valid('SUM', 'AVERAGE', 'MAX', 'MIN', 'COUNT'),
  tradeStatus: Joi.string().valid('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'),
  friendStatus: Joi.string().valid('PENDING', 'ACCEPTED', 'BLOCKED'),
  questStatus: Joi.string().valid('AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'FAILED'),
  rarityLevel: Joi.string().valid('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'),
  shopType: Joi.string().valid('GENERAL', 'PREMIUM', 'EVENT', 'SEASONAL')
};

/**
 * @constant {Object} gameValidationSchemas
 * @description Validation schemas for game-related operations
 * @property {Joi.Schema} gameStatus - Game status update validation
 * @property {Joi.Schema} leaderboardQuery - Leaderboard query parameters validation
 * @property {Joi.Schema} achievementProgress - Achievement progress update validation
 * @property {Joi.Schema} gameParams - Game route parameters validation
 * @property {Joi.Schema} achievementParams - Achievement route parameters validation
 * @property {Joi.Schema} competitorParams - Competitor route parameters validation
 * @property {Joi.Schema} powerupParams - Power-up route parameters validation
 * @property {Joi.Schema} dailyChallengeQuery - Daily challenge query parameters validation
 * @property {Joi.Schema} challengeProgress - Challenge progress update validation
 * @property {Joi.Schema} powerupActivation - Power-up activation validation
 * @property {Joi.Schema} socialPost - Social post content validation
 */
const gameValidationSchemas = {
  gameStatus: Joi.object({
    is_active: Joi.boolean().required()
  }),

  leaderboardQuery: Joi.object({
    type: Joi.string().valid('OVERALL', 'ACHIEVEMENT', 'QUEST', 'CUSTOM'),
    timeframe: Joi.string().valid('ALL_TIME', 'SEASON', 'MONTHLY', 'WEEKLY'),
    limit: commonSchemas.pagination.limit
  }),

  achievementProgress: Joi.object({
    progress: Joi.number().integer().min(0).required()
  }),

  gameParams: Joi.object({
    gameId: commonSchemas.uuid.required()
  }),

  achievementParams: Joi.object({
    achievementId: commonSchemas.uuid.required()
  }),

  competitorParams: Joi.object({
    gameId: commonSchemas.uuid.required(),
    competitorId: commonSchemas.uuid.required()
  }),

  powerupParams: Joi.object({
    powerupId: commonSchemas.uuid.required()
  }),

  dailyChallengeQuery: Joi.object({
    limit: commonSchemas.pagination.limit,
    offset: commonSchemas.pagination.offset
  }),

  challengeProgress: Joi.object({
    progress: Joi.number().min(0).required()
  }),

  powerupActivation: Joi.object({
    competitorId: commonSchemas.uuid,
    powerupId: commonSchemas.uuid
  }),

  socialPost: Joi.object({
    content: Joi.string().max(500).required()
  })
};

/**
 * @constant {Object} economyValidationSchemas
 * @description Validation schemas for economy-related operations
 * @property {Joi.Schema} shop - Shop creation/update validation
 * @property {Joi.Schema} shopItem - Shop item creation/update validation
 * @property {Joi.Schema} transfer - Currency transfer validation
 * @property {Joi.Schema} purchase - Item purchase validation
 * @property {Joi.Schema} useItem - Item usage validation
 * @property {Joi.Schema} trade - Trade creation validation
 * @property {Joi.Schema} tradeResponse - Trade response validation
 * @property {Joi.Schema} economyMetricsQuery - Economy metrics query validation
 * @property {Joi.Schema} shopQuery - Shop query parameters validation
 * @property {Joi.Schema} inventoryQuery - Inventory query parameters validation
 * @property {Joi.Schema} tradeQuery - Trade query parameters validation
 * @property {Joi.Schema} metricsQuery - Metrics query parameters validation
 * @property {Joi.Schema} exchangeRateQuery - Exchange rate query validation
 * @property {Joi.Schema} marketQuery - Market query parameters validation
 * @property {Joi.Schema} bulkItems - Bulk item creation validation
 */
const economyValidationSchemas = {
  shop: Joi.object({
    game_id: commonSchemas.uuid.required(),
    name: Joi.string().required().max(255),
    description: Joi.string().required(),
    type: enums.shopType.required(),
    currency_type: Joi.string().required(),
    is_active: commonSchemas.boolean
  }),

  shopItem: Joi.object({
    shop_id: commonSchemas.uuid.required(),
    name: Joi.string().required().max(255),
    description: Joi.string().required(),
    type: Joi.string().required(),
    rarity: enums.rarityLevel.required(),
    price: Joi.number().integer().min(0).required(),
    quantity: Joi.number().integer().min(0).allow(null),
    attributes: Joi.object().default({}),
    requirements: Joi.object().default({}),
    is_active: commonSchemas.boolean
  }),

  transfer: Joi.object({
    to_competitor_id: commonSchemas.uuid.required(),
    amount: Joi.number().integer().min(1).required(),
    reason: Joi.string().max(255)
  }),

  purchase: Joi.object({
    quantity: Joi.number().integer().min(1).default(1)
  }),

  useItem: Joi.object({
    quantity: Joi.number().integer().min(1).default(1)
  }),

  trade: Joi.object({
    to_competitor_id: commonSchemas.uuid.required(),
    items: Joi.array().items(Joi.object({
      item_id: commonSchemas.uuid.required(),
      quantity: Joi.number().integer().min(1).required()
    })).min(1).required()
  }),

  tradeResponse: Joi.object({
    accept: commonSchemas.boolean.required()
  }),

  economyMetricsQuery: Joi.object({
    timeframe: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME').default('DAILY')
  }),

  shopQuery: Joi.object({
    game_id: commonSchemas.uuid,
    type: enums.shopType
  }),
  
  inventoryQuery: Joi.object({
    include_used: commonSchemas.boolean.default(false)
  }),
  
  tradeQuery: Joi.object({
    status: enums.tradeStatus,
    limit: commonSchemas.pagination.limit,
    offset: commonSchemas.pagination.offset
  }),
  
  metricsQuery: Joi.object({
    timeframe: Joi.string().valid('DAY', 'WEEK', 'MONTH', 'YEAR').default('WEEK'),
    granularity: Joi.string().valid('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY').default('DAILY')
  }),

  exchangeRateQuery: Joi.object({
    base: Joi.string().required(),
    targets: Joi.array().items(Joi.string()).single().required()
  }),

  marketQuery: Joi.object({
    game_id: commonSchemas.uuid.required(),
    type: Joi.string().valid('ITEM', 'CURRENCY', 'SERVICE'),
    min_price: Joi.number().min(0),
    max_price: Joi.number().min(0),
    limit: commonSchemas.pagination.limit,
    offset: commonSchemas.pagination.offset
  }),

  bulkItems: Joi.array().items(
    economyValidationSchemas.shopItem
  ).min(1)
};

/**
 * @constant {Object} seasonValidationSchemas
 * @description Validation schemas for season-related operations
 * @property {Joi.Schema} seasonParams - Season route parameters validation
 * @property {Joi.Schema} competitorParams - Competitor route parameters validation
 * @property {Joi.Schema} addXP - XP addition validation
 * @property {Joi.Schema} claimTierReward - Tier reward claim validation
 * @property {Joi.Schema} leaderboardQuery - Leaderboard query parameters validation
 * @property {Joi.Schema} competition - Competition creation/update validation
 * @property {Joi.Schema} objectiveProgress - Objective progress update validation
 * @property {Joi.Schema} analyticsQuery - Analytics query parameters validation
 * @property {Joi.Schema} bulkClaimRewards - Bulk reward claim validation
 * @property {Joi.Schema} seasonState - Season state update validation
 * @property {Joi.Schema} bulkRewardClaim - Bulk reward claim validation
 * @property {Joi.Schema} seasonAnalytics - Season analytics query validation
 */
const seasonValidationSchemas = {
  seasonParams: Joi.object({
    id: commonSchemas.uuid.required()
  }),

  competitorParams: Joi.object({
    id: commonSchemas.uuid.required(),
    competitorId: commonSchemas.uuid.required()
  }),

  addXP: Joi.object({
    xp_amount: Joi.number().integer().min(1).required(),
    source: Joi.string().required()
  }),

  claimTierReward: Joi.object({
    is_premium: commonSchemas.boolean.default(false)
  }),

  leaderboardQuery: Joi.object({
    limit: commonSchemas.pagination.limit,
    offset: commonSchemas.pagination.offset,
    timeframe: Joi.string().valid('ALL_TIME', 'SEASON', 'MONTHLY', 'WEEKLY').default('ALL_TIME')
  }),

  competition: Joi.object({
    season_id: commonSchemas.uuid.required(),
    name: Joi.string().max(255).required(),
    description: Joi.string().required(),
    type: enums.competitionType.required(),
    start_date: commonSchemas.timestamp.required(),
    end_date: commonSchemas.timestamp.required(),
    entry_cost: Joi.number().integer().min(0).default(0),
    max_participants: Joi.number().integer().min(1).allow(null),
    recurrence: enums.recurrencePattern.allow(null),
    leaderboard_visible: commonSchemas.boolean.default(true)
  }),

  objectiveProgress: Joi.object({
    progress: Joi.number().integer().min(0).max(100).required()
  }),

  analyticsQuery: Joi.object({
    start_date: commonSchemas.timestamp,
    end_date: commonSchemas.timestamp,
    metrics: Joi.array().items(Joi.string()).single(),
    timeframe: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME').default('DAILY')
  }),

  bulkClaimRewards: Joi.object({
    tier_ids: Joi.array().items(commonSchemas.uuid).min(1).required()
  }),

  seasonState: Joi.object({
    current_tier: Joi.number().integer().min(1),
    days_remaining: Joi.number().integer().min(0),
    active_participants: Joi.number().integer().min(0)
  }),
  
  bulkRewardClaim: Joi.object({
    tier_ids: Joi.array().items(commonSchemas.uuid).min(1).required()
  }),
  
  seasonAnalytics: Joi.object({
    start_date: commonSchemas.timestamp,
    end_date: commonSchemas.timestamp,
    metrics: Joi.array().items(Joi.string().valid('PARTICIPATION', 'REVENUE', 'ENGAGEMENT'))
  })
};

/**
 * @constant {Object} socialValidationSchemas
 * @description Validation schemas for social-related operations
 * @property {Joi.Schema} friendRequest - Friend request validation
 */
const socialValidationSchemas = {
  friendRequest: Joi.object({
    friend_id: commonSchemas.uuid.required()
  }),

  friendRequestResponse: Joi.object({
    accept: commonSchemas.boolean.required()
  }),

  team: Joi.object({
    name: Joi.string().max(255).required(),
    description: Joi.string().required(),
    game_id: commonSchemas.uuid.required(),
    is_private: commonSchemas.boolean.default(false),
    member_ids: Joi.array().items(commonSchemas.uuid).min(1)
  }),

  teamMember: Joi.object({
    user_id: commonSchemas.uuid.required(),
    role: Joi.string().valid('LEADER', 'MEMBER', 'COACH').default('MEMBER')
  }),

  teamQuery: Joi.object({
    game_id: commonSchemas.uuid,
    limit: commonSchemas.pagination.limit,
    offset: commonSchemas.pagination.offset
  }),

  feed: Joi.object({
    name: Joi.string().max(255).required(),
    description: Joi.string(),
    type: Joi.string().valid('PERSONAL', 'TEAM', 'GAME', 'GLOBAL').required(),
    visibility: Joi.string().valid('PUBLIC', 'PRIVATE', 'FRIENDS').default('PUBLIC'),
    settings: Joi.object({
      allow_comments: commonSchemas.boolean.default(true),
      allow_reactions: commonSchemas.boolean.default(true),
      moderated: commonSchemas.boolean.default(false)
    }).default({})
  }),

  feedItem: Joi.object({
    content: Joi.string().required(),
    type: Joi.string().valid('TEXT', 'IMAGE', 'VIDEO', 'LINK').required(),
    metadata: Joi.object().default({})
  }),

  feedInteraction: Joi.object({
    type: Joi.string().valid('LIKE', 'COMMENT').required(),
    content: Joi.string().when('type', {
      is: 'COMMENT',
      then: Joi.string().required(),
      otherwise: Joi.string().allow(null)
    })
  }),

  chatGroup: Joi.object({
    name: Joi.string().max(255).required(),
    type: Joi.string().valid('DIRECT', 'GROUP', 'TEAM', 'GAME').required(),
    members: Joi.array().items(commonSchemas.uuid).min(2).required(),
    settings: Joi.object({
      allow_invites: commonSchemas.boolean.default(true),
      allow_reactions: commonSchemas.boolean.default(true),
      moderated: commonSchemas.boolean.default(false)
    }).default({})
  }),

  message: Joi.object({
    content: Joi.string().required(),
    type: Joi.string().valid('TEXT', 'IMAGE', 'SYSTEM').required()
  }),

  messageReaction: Joi.object({
    emoji: Joi.string().required()
  }),

  chatQuery: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    before: commonSchemas.timestamp
  }),

  teamActivity: Joi.object({
    type: Joi.string().required(),
    description: Joi.string().required(),
    metadata: Joi.object().default({})
  }),

  maintenanceLog: Joi.object({
    type: Joi.string().required(),
    description: Joi.string().required(),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').required(),
    status: Joi.string().valid('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED').required()
  }),

  maintenanceQuery: Joi.object({
    start_date: commonSchemas.timestamp,
    end_date: commonSchemas.timestamp,
    type: Joi.string(),
    limit: commonSchemas.pagination.limit,
    offset: commonSchemas.pagination.offset
  }),

  friendSuggestionQuery: Joi.object({
    game_id: commonSchemas.uuid,
    limit: commonSchemas.pagination.limit
  }),
  
  teamActivityQuery: Joi.object({
    types: Joi.array().items(Joi.string()),
    limit: commonSchemas.pagination.limit,
    offset: commonSchemas.pagination.offset
  }),
  
  chatSearch: Joi.object({
    query: Joi.string().required(),
    limit: commonSchemas.pagination.limit
  }),
  
  feedAnalytics: Joi.object({
    start_date: commonSchemas.timestamp,
    end_date: commonSchemas.timestamp,
    metrics: Joi.array().items(Joi.string().valid('ENGAGEMENT', 'REACH', 'ACTIVITY'))
  })
};

// Main table schemas
const departmentSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().allow(null)
});

const userSchema = Joi.object({
  user_name: Joi.string().pattern(/^[a-z0-9._-]+$/).required(),
  first_name: Joi.string().max(40).required(),
  last_name: Joi.string().max(40).required(),
  email: commonSchemas.email.required(),
  role: enums.userRole.default('USER'),
  password_hash: Joi.string().required(),
  active: commonSchemas.boolean.default(true),
  locked_out: commonSchemas.boolean.default(false),
  last_login: commonSchemas.timestamp.allow(null),
  department_id: commonSchemas.uuid.allow(null),
  avatar_url: commonSchemas.url.allow(null),
  about_me: Joi.string().allow(null),
  email_verified: commonSchemas.boolean.default(false)
});

const ssoProviderSchema = Joi.object({
  name: Joi.string().max(255).required(),
  entity_id: Joi.string().required(),
  login_url: commonSchemas.url.required(),
  logout_url: commonSchemas.url.allow(null),
  certificate: Joi.string().required(),
  active: commonSchemas.boolean.default(true)
});

const gameSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  gamemaster: commonSchemas.uuid.required(),
  primary_color: enums.hexColor.default('#1F8476'),
  secondary_color: enums.hexColor.default('#6ABECF'),
  image_url: commonSchemas.url.allow(null),
  background_url: commonSchemas.url.allow(null),
  currency_name: Joi.string().max(50).default('Points'),
  currency_conversion: Joi.number().precision(4).default(0.01),
  is_active: commonSchemas.boolean.default(false),
  advance_percentage: Joi.number().integer().min(0).max(100).default(10)
});

const seasonSchema = Joi.object({
  game_id: commonSchemas.uuid.required(),
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  start_date: commonSchemas.timestamp.required(),
  end_date: commonSchemas.timestamp.required(),
  theme: Joi.string().allow(null),
  battle_pass_enabled: commonSchemas.boolean.default(true),
  current_season: commonSchemas.boolean.default(false)
});

const competitionSchema = Joi.object({
  game_id: commonSchemas.uuid.required(),
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  type: enums.competitionType.required(),
  start_date: commonSchemas.timestamp.required(),
  end_date: commonSchemas.timestamp.required(),
  entry_cost: Joi.number().integer().min(0).default(0),
  max_participants: Joi.number().integer().min(1).allow(null),
  recurrence: enums.recurrencePattern.allow(null),
  leaderboard_visible: commonSchemas.boolean.default(true)
});

const competitorSchema = Joi.object({
  competition_id: commonSchemas.uuid.required(),
  user_id: commonSchemas.uuid.required(),
  score: Joi.number().integer().min(0).default(0),
  rank: Joi.number().integer().min(1).allow(null),
  is_active: commonSchemas.boolean.default(true)
});

const teamSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string(),
  is_private: Joi.boolean().default(false),
  game_id: commonSchemas.uuid.required(),
  member_ids: Joi.array().items(Joi.string().uuid()).min(1)
});

const leaderboardSchema = Joi.object({
  game_id: Joi.string().uuid().required(),
  name: Joi.string().required().max(255),
  type: Joi.string().valid('OVERALL', 'ACHIEVEMENT', 'QUEST', 'CUSTOM').required(),
  timeframe: Joi.string().valid('ALL_TIME', 'SEASON', 'MONTHLY', 'WEEKLY').required(),
  description: Joi.string().max(1000),
  is_active: Joi.boolean().default(true)
});

const achievementSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  game_id: commonSchemas.uuid.required(),
  type: enums.notificationType.required(),
  is_active: commonSchemas.boolean.default(true)
});

const questSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  game_id: commonSchemas.uuid.required(),
  type: enums.questStatus.required(),
  is_active: commonSchemas.boolean.default(true)
});

const rewardShopSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  game_id: commonSchemas.uuid.required(),
  type: Joi.string().valid('GENERAL', 'PREMIUM', 'EVENT', 'SEASONAL').required(),
  currency_type: Joi.string().required(),
  is_active: Joi.boolean()
});

const shopItemSchema = Joi.object({
  shop_id: Joi.string().uuid().required(),
  name: Joi.string().required().max(255),
  description: Joi.string().required(),
  type: Joi.string().required(),
  rarity: Joi.string().valid('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY').required(),
  price: Joi.number().integer().min(0).required(),
  quantity: Joi.number().integer().min(0).allow(null),
  attributes: Joi.object().default({}),
  requirements: Joi.object().default({}),
  is_active: Joi.boolean()
});

const powerupSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  game_id: commonSchemas.uuid.required(),
  type: Joi.string().valid('GENERAL', 'PREMIUM', 'EVENT', 'SEASONAL').required(),
  is_active: Joi.boolean()
});

const powerupInstanceSchema = Joi.object({
  powerup_id: commonSchemas.uuid.required(),
  user_id: commonSchemas.uuid.required(),
  game_id: commonSchemas.uuid.required(),
  start_date: commonSchemas.timestamp.required(),
  end_date: commonSchemas.timestamp.required(),
  is_active: commonSchemas.boolean.default(true)
});

const notificationSchema = Joi.object({
  user_id: commonSchemas.uuid.required(),
  type: enums.notificationType.required(),
  message: Joi.string().required(),
  is_read: commonSchemas.boolean.default(false),
  created_at: commonSchemas.timestamp.default('now')
});

const auditLogSchema = Joi.object({
  user_id: commonSchemas.uuid.required(),
  action: Joi.string().required(),
  description: Joi.string().required(),
  created_at: commonSchemas.timestamp.required()
});

const kpiSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  game_id: commonSchemas.uuid.required(),
  type: enums.kpiAggregation.required(),
  is_active: commonSchemas.boolean.default(true)
});

const kpiValueSchema = Joi.object({
  kpi_id: commonSchemas.uuid.required(),
  value: Joi.number().required(),
  date: commonSchemas.timestamp.required()
});

const surveySchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  game_id: commonSchemas.uuid.required(),
  is_active: commonSchemas.boolean.default(true)
});

const surveyQuestionSchema = Joi.object({
  survey_id: commonSchemas.uuid.required(),
  question: Joi.string().required(),
  type: Joi.string().valid('TEXT', 'MULTIPLE_CHOICE', 'RATING').required(),
  options: Joi.array().items(Joi.string()).when('type', {
    is: 'MULTIPLE_CHOICE',
    then: Joi.array().items(Joi.string()).min(2).max(10).required()
  }),
  is_active: commonSchemas.boolean.default(true)
});

const surveyResponseSchema = Joi.object({
  survey_id: commonSchemas.uuid.required(),
  question_id: commonSchemas.uuid.required(),
  response: Joi.string().required(),
  user_id: commonSchemas.uuid.required(),
  date: commonSchemas.timestamp.required()
});

const tradeSchema = Joi.object({
  user_id: commonSchemas.uuid.required(),
  type: enums.tradeStatus.required(),
  amount: Joi.number().integer().min(0).required(),
  currency: Joi.string().max(50).required(),
  date: commonSchemas.timestamp.required()
});

const friendListSchema = Joi.object({
  user_id: commonSchemas.uuid.required(),
  friend_id: commonSchemas.uuid.required(),
  status: enums.friendStatus.required(),
  date: commonSchemas.timestamp.required()
});

const chatGroupSchema = Joi.object({
  name: Joi.string().required().max(255),
  type: Joi.string().valid('DIRECT', 'GROUP', 'TEAM', 'GAME').required(),
  members: Joi.array().items(Joi.string().uuid()).min(2).required(),
  settings: Joi.object({
    allow_invites: Joi.boolean(),
    allow_reactions: Joi.boolean(),
    moderated: Joi.boolean()
  }).default({})
});

const chatMessageSchema = Joi.object({
  content: Joi.string().required(),
  type: Joi.string().valid('TEXT', 'IMAGE', 'SYSTEM').required(),
  sender_id: commonSchemas.uuid.required(),
  receiver_id: commonSchemas.uuid.required(),
  date: commonSchemas.timestamp.required()
});

const chatMemberSchema = Joi.object({
  chat_id: commonSchemas.uuid.required(),
  user_id: commonSchemas.uuid.required(),
  role: Joi.string().valid('LEADER', 'OFFICER', 'MEMBER').required(),
  date: commonSchemas.timestamp.required()
});

const dailyChallengeSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  game_id: commonSchemas.uuid.required(),
  type: enums.questStatus.required(),
  is_active: commonSchemas.boolean.default(true)
});

const challengeProgressSchema = Joi.object({
  user_id: commonSchemas.uuid.required(),
  challenge_id: commonSchemas.uuid.required(),
  progress: Joi.number().integer().min(0).max(100).required(),
  date: commonSchemas.timestamp.required()
});

const indexStatsHistorySchema = Joi.object({
  date: commonSchemas.timestamp.required(),
  game_id: commonSchemas.uuid.required(),
  type: Joi.string().valid('OVERALL', 'SEASONAL', 'WEEKLY', 'DAILY').required(),
  value: Joi.number().required()
});

const maintenanceLogSchema = Joi.object({
  date: commonSchemas.timestamp.required(),
  game_id: commonSchemas.uuid.required(),
  type: Joi.string().valid('INDEX_STATS', 'MAINTENANCE').required(),
  description: Joi.string().required()
});

// Additional table schemas
const teamCompetitionSchema = Joi.object({
  team_id: commonSchemas.uuid.required(),
  competition_id: commonSchemas.uuid.required(),
  joined_at: commonSchemas.timestamp.default('now')
});

const teamMemberSchema = Joi.object({
  team_id: commonSchemas.uuid.required(),
  user_id: commonSchemas.uuid.required(),
  role: Joi.string().valid('LEADER', 'MEMBER', 'COACH').default('MEMBER'),
  joined_at: commonSchemas.timestamp.default('now')
});

const questObjectiveSchema = Joi.object({
  quest_id: commonSchemas.uuid.required(),
  description: Joi.string().required(),
  type: Joi.string().valid('KILL', 'COLLECT', 'EXPLORE', 'CRAFT').required(),
  target: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required()
});

const questProgressionSchema = Joi.object({
  quest_id: commonSchemas.uuid.required(),
  user_id: commonSchemas.uuid.required(),
  progress: Joi.number().integer().min(0).required(),
  completed: commonSchemas.boolean.default(false)
});

const seasonTierSchema = Joi.object({
  season_id: commonSchemas.uuid.required(),
  name: Joi.string().required(),
  level_required: Joi.number().integer().min(1).required(),
  rewards: Joi.object({
    currency: Joi.number().integer().min(0),
    items: Joi.array().items(commonSchemas.uuid)
  }).default({})
});

const seasonProgressSchema = Joi.object({
  season_id: commonSchemas.uuid.required(),
  user_id: commonSchemas.uuid.required(),
  level: Joi.number().integer().min(1).default(1),
  xp: Joi.number().integer().min(0).default(0)
});

const seasonRewardSchema = Joi.object({
  season_id: commonSchemas.uuid.required(),
  tier_id: commonSchemas.uuid.required(),
  user_id: commonSchemas.uuid.required(),
  claimed_at: commonSchemas.timestamp.default('now')
});

const badgeSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  game_id: commonSchemas.uuid.required(),
  rarity: enums.rarityLevel.default('COMMON')
});

const badgeInstanceSchema = Joi.object({
  badge_id: commonSchemas.uuid.required(),
  user_id: commonSchemas.uuid.required(),
  earned_at: commonSchemas.timestamp.default('now')
});

const itemSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  game_id: commonSchemas.uuid.required(),
  type: Joi.string().valid('WEAPON', 'ARMOR', 'CONSUMABLE', 'MATERIAL').required(),
  rarity: enums.rarityLevel.default('COMMON')
});

const itemInstanceSchema = Joi.object({
  item_id: commonSchemas.uuid.required(),
  user_id: commonSchemas.uuid.required(),
  quantity: Joi.number().integer().min(1).default(1)
});

// Currency and Transactions
const currencySchema = Joi.object({
  name: Joi.string().max(50).required(),
  game_id: commonSchemas.uuid.required(),
  symbol: Joi.string().max(5).required(),
  conversion_rate: Joi.number().precision(4).default(1.0),
  is_primary: commonSchemas.boolean.default(false)
});

const currencyTransactionSchema = Joi.object({
  user_id: commonSchemas.uuid.required(),
  currency_id: commonSchemas.uuid.required(),
  amount: Joi.number().precision(2).required(),
  type: Joi.string().valid('EARNED', 'SPENT', 'TRANSFER', 'ADJUSTMENT').required(),
  description: Joi.string().max(255).required(),
  timestamp: commonSchemas.timestamp.default('now')
});

// Events and Participation
const eventSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  game_id: commonSchemas.uuid.required(),
  start_date: commonSchemas.timestamp.required(),
  end_date: commonSchemas.timestamp.required(),
  type: Joi.string().valid('SEASONAL', 'SPECIAL', 'COMMUNITY').required(),
  is_active: commonSchemas.boolean.default(true)
});

const eventParticipationSchema = Joi.object({
  event_id: commonSchemas.uuid.required(),
  user_id: commonSchemas.uuid.required(),
  status: Joi.string().valid('REGISTERED', 'PARTICIPATING', 'COMPLETED').default('REGISTERED'),
  start_date: commonSchemas.timestamp.default('now')
});

// Moderation and Support
const moderationActionSchema = Joi.object({
  moderator_id: commonSchemas.uuid.required(),
  user_id: commonSchemas.uuid.required(),
  action_type: Joi.string().valid('WARNING', 'SUSPENSION', 'BAN').required(),
  reason: Joi.string().max(1000).required(),
  duration: Joi.number().integer().min(0).allow(null),
  timestamp: commonSchemas.timestamp.default('now')
});

const reportSchema = Joi.object({
  reporter_id: commonSchemas.uuid.required(),
  reported_id: commonSchemas.uuid.required(),
  reason: Joi.string().max(1000).required(),
  status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'RESOLVED').default('OPEN'),
  timestamp: commonSchemas.timestamp.default('now')
});

const supportTicketSchema = Joi.object({
  user_id: commonSchemas.uuid.required(),
  type: Joi.string().valid('BUG', 'FEEDBACK', 'SUPPORT').required(),
  description: Joi.string().max(1000).required(),
  status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'RESOLVED').default('OPEN'),
  timestamp: commonSchemas.timestamp.default('now')
});

// Content Management
const announcementSchema = Joi.object({
  title: Joi.string().max(255).required(),
  content: Joi.string().required(),
  game_id: commonSchemas.uuid.required(),
  is_active: commonSchemas.boolean.default(true),
  start_date: commonSchemas.timestamp.default('now'),
  end_date: commonSchemas.timestamp.allow(null)
});

const contentVersionSchema = Joi.object({
  game_id: commonSchemas.uuid.required(),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).required(),
  release_notes: Joi.string().required(),
  release_date: commonSchemas.timestamp.default('now'),
  is_active: commonSchemas.boolean.default(true)
});

const localizationSchema = Joi.object({
  key: Joi.string().max(255).required(),
  language: Joi.string().length(2).required(),
  value: Joi.string().required(),
  game_id: commonSchemas.uuid.required()
});

// Analytics
const analyticsEventSchema = Joi.object({
  user_id: commonSchemas.uuid.required(),
  event_type: Joi.string().max(255).required(),
  event_data: Joi.object().required(),
  timestamp: commonSchemas.timestamp.default('now')
});

const analyticsSessionSchema = Joi.object({
  user_id: commonSchemas.uuid.required(),
  start_time: commonSchemas.timestamp.default('now'),
  end_time: commonSchemas.timestamp.allow(null),
  duration: Joi.number().integer().min(0).allow(null)
});

// Feature Flags and Experiments
const featureFlagSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  is_active: commonSchemas.boolean.default(false),
  game_id: commonSchemas.uuid.required()
});

const experimentSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  game_id: commonSchemas.uuid.required(),
  start_date: commonSchemas.timestamp.default('now'),
  end_date: commonSchemas.timestamp.allow(null),
  is_active: commonSchemas.boolean.default(true)
});

const experimentVariantSchema = Joi.object({
  experiment_id: commonSchemas.uuid.required(),
  name: Joi.string().max(255).required(),
  weight: Joi.number().min(0).max(1).required()
});

const experimentParticipationSchema = Joi.object({
  experiment_id: commonSchemas.uuid.required(),
  user_id: commonSchemas.uuid.required(),
  variant_id: commonSchemas.uuid.required(),
  start_date: commonSchemas.timestamp.default('now'),
  end_date: commonSchemas.timestamp.allow(null)
});

// Add to userValidationSchemas
const userValidationSchemas = {
  userPreferences: Joi.object({
    theme: Joi.string().valid('LIGHT', 'DARK', 'SYSTEM').default('SYSTEM'),
    notifications: Joi.object({
      email: Joi.boolean().default(true),
      push: Joi.boolean().default(true),
      in_app: Joi.boolean().default(true)
    }),
    privacy: Joi.object({
      profile_visibility: Joi.string().valid('PUBLIC', 'FRIENDS', 'PRIVATE').default('PUBLIC'),
      activity_sharing: Joi.boolean().default(true)
    })
  }),
  
  sessionQuery: Joi.object({
    active_only: Joi.boolean().default(false)
  }),
  
  deviceInfo: Joi.object({
    os: Joi.string().required(),
    browser: Joi.string().required(),
    ip_address: Joi.string().ip().required()
  }),
  
  bulkUserOperation: Joi.object({
    user_ids: Joi.array().items(commonSchemas.uuid).min(1).max(100).required(),
    operation: Joi.string().valid('DISABLE', 'ENABLE', 'DELETE').required()
  })
};

// Export all schemas
module.exports = {
  commonSchemas,
  enums,
  gameValidationSchemas,
  economyValidationSchemas,
  seasonValidationSchemas,
  socialValidationSchemas,
  departmentSchema,
  userSchema,
  ssoProviderSchema,
  gameSchema,
  seasonSchema,
  competitionSchema,
  competitorSchema,
  teamSchema,
  leaderboardSchema,
  achievementSchema,
  questSchema,
  rewardShopSchema,
  shopItemSchema,
  powerupSchema,
  powerupInstanceSchema,
  notificationSchema,
  auditLogSchema,
  kpiSchema,
  kpiValueSchema,
  surveySchema,
  surveyQuestionSchema,
  surveyResponseSchema,
  tradeSchema,
  friendListSchema,
  chatGroupSchema,
  chatMessageSchema,
  chatMemberSchema,
  dailyChallengeSchema,
  challengeProgressSchema,
  indexStatsHistorySchema,
  maintenanceLogSchema,
  teamCompetitionSchema,
  teamMemberSchema,
  questObjectiveSchema,
  questProgressionSchema,
  seasonTierSchema,
  seasonProgressSchema,
  seasonRewardSchema,
  badgeSchema,
  badgeInstanceSchema,
  itemSchema,
  itemInstanceSchema,
  currencySchema,
  currencyTransactionSchema,
  eventSchema,
  eventParticipationSchema,
  moderationActionSchema,
  reportSchema,
  supportTicketSchema,
  announcementSchema,
  contentVersionSchema,
  localizationSchema,
  analyticsEventSchema,
  analyticsSessionSchema,
  featureFlagSchema,
  experimentSchema,
  experimentVariantSchema,
  experimentParticipationSchema,
  userValidationSchemas
}; 