export const DataModelFields = {
  User: {
    sys_id: 'string',
    user_name: 'string',
    first_name: 'string',
    last_name: 'string',
    email: 'string',
    active: 'boolean',
    locked_out: 'boolean',
    password: 'string',
    password_needs_reset: 'boolean',
    last_login: 'datetime',
    source: 'string',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string',
    department_id: 'string',
    role: 'string',
    password_hash: 'string'
  },
  Game: {
    sys_id: 'string',
    number: 'string',
    name: 'string',
    description: 'string',
    gamemaster: 'string',
    image_url: 'image',
    point_system: 'string',
    primary_color: 'string',
    secondary_color: 'string',
    background_url: 'image',
    competitor_group: 'string',
    active: 'boolean',
    advance_percentage: 'number',
    recurring: 'string',
    league_last_action: 'datetime',
    kpi_data: 'string',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  Competition: {
    sys_id: 'string',
    number: 'string',
    name: 'string',
    description: 'string',
    game: 'string',
    start_date: 'datetime',
    end_date: 'datetime',
    competitor_group: 'string',
    image_url: 'image',
    competition_type: 'string',
    player_type: 'string',
    schedule_type: 'string',
    state: 'number',
    first_place_badge: 'string',
    second_place_badge: 'string',
    third_place_badge: 'string',
    achievements: 'string[]',
    include_all_game_achievements: 'boolean',
    goal_points: 'number',
    recurring: 'string',
    deadline: 'datetime',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  KpiInstanceRollup: {
    sys_id: 'string',
    number: 'string',
    competitor: 'string',
    kpi: 'string',
    value: 'number',
    year: 'number',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  Badge: {
    sys_id: 'string',
    name: 'string',
    description: 'string',
    image_url: 'image',
    color: 'string',
    game: 'string',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  LevelInstance: {
    sys_id: 'string',
    number: 'string',
    level: 'string',
    start_date: 'datetime',
    end_date: 'datetime',
    order_num: 'number',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  KeyPerformanceIndicator: {
    sys_id: 'string',
    name: 'string',
    description: 'string',
    game: 'string',
    type: 'string',
    aggregation: 'string',
    table_name: 'string',
    field: 'string',
    condition: 'string',
    achievement: 'string',
    order_num: 'number',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  Competitor: {
    sys_id: 'string',
    user_id: 'string',
    total_earnings: 'number',
    account_balance: 'number',
    performance_group: 'string',
    avatar_url: 'image',
    about_me: 'string',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  Achievement: {
    sys_id: 'string',
    number: 'string',
    name: 'string',
    description: 'string',
    game: 'string',
    trigger_table: 'string',
    trigger_condition: 'string',
    awardee: 'string',
    point_value: 'number',
    active: 'boolean',
    award_date: 'string',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  Level: {
    sys_id: 'string',
    number: 'string',
    name: 'string',
    description: 'string',
    game: 'string',
    competition: 'string',
    type: 'string',
    image_url: 'image',
    order_num: 'number',
    color: 'string',
    entry_points: 'number',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  PointSystem: {
    sys_id: 'string',
    label: 'string',
    image_url: 'image',
    dollar_conversion: 'number',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  Notifier: {
    sys_id: 'string',
    description: 'string',
    receiver: 'string',
    seen: 'boolean',
    sender: 'string',
    notification_type: 'string',
    type: 'string',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  Team: {
    sys_id: 'string',
    name: 'string',
    members: 'string[]',
    image_url: 'image',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  TeamCompetition: {
    sys_id: 'string',
    team_id: 'string',
    competition_id: 'string',
    weight: 'number',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  Goal: {
    sys_id: 'string',
    name: 'string',
    description: 'string',
    game: 'string',
    achievement: 'string',
    recurring: 'string',
    target: 'number',
    type: 'string',
    competitors: 'string[]',
    active: 'boolean',
    color: 'string',
    last_action: 'datetime',
    exclude_weekends: 'boolean',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  BadgeCompetitor: {
    sys_id: 'string',
    badge_id: 'string',
    competitor_id: 'string',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  LevelInstanceMember: {
    sys_id: 'string',
    level_instance: 'string',
    competitor: 'string',
    points: 'number',
    place: 'number',
    league_change: 'string',
    level_order: 'number',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  LeaderboardMember: {
    sys_id: 'string',
    competition: 'string',
    competitor: 'string',
    competitor_type: 'string',
    points: 'number',
    place: 'number',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  KpiInstance: {
    sys_id: 'string',
    number: 'string',
    kpi: 'string',
    competitor: 'string',
    date: 'datetime',
    value: 'number',
    year: 'string',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  AchievementCompetitor: {
    sys_id: 'string',
    achievement_id: 'string',
    competitor_id: 'string',
    record_id: 'string',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  GoalInstance: {
    sys_id: 'string',
    number: 'string',
    goal: 'string',
    competitor: 'string',
    start_date: 'datetime',
    end_date: 'datetime',
    target: 'number',
    value: 'number',
    sys_created_on: 'datetime',
    sys_updated_on: 'datetime',
    sys_created_by: 'string',
    sys_updated_by: 'string'
  },
  Department: {
    sys_id: 'string',
    name: 'string',
    description: 'string'
  },
  ChatGroup: {
    sys_id: 'string',
    name: 'string',
    created_by: 'string',
    created_on: 'datetime'
  },
  ChatMessage: {
    sys_id: 'string',
    chat_group_id: 'string',
    sender_id: 'string',
    content: 'string',
    sent_at: 'datetime'
  },
  ChatGroupMember: {
    sys_id: 'string',
    chat_group_id: 'string',
    user_id: 'string',
    joined_at: 'datetime'
  },
  Survey: {
    sys_id: 'string',
    title: 'string',
    description: 'string',
    created_on: 'datetime'
  },
  SurveyQuestion: {
    sys_id: 'string',
    survey_id: 'string',
    question_text: 'string',
    question_type: 'string',
    options: 'any'
  },
  SurveyResponse: {
    sys_id: 'string',
    survey_id: 'string',
    respondent_id: 'string',
    responses: 'any',
    submitted_at: 'datetime'
  },
  NotificationStatus: {
    sys_id: 'string',
    notification_id: 'string',
    user_id: 'string',
    read: 'boolean',
    read_at: 'datetime | null'
  }
} as const;

export type DataModelName = keyof typeof DataModelFields;
export type DataModelField<T extends DataModelName> = keyof typeof DataModelFields[T];
export type DataModelType<T extends DataModelName, F extends DataModelField<T>> = typeof DataModelFields[T][F];

export function createEmptyModel<T extends DataModelName>(modelName: T): { [K in DataModelField<T>]: any } {
  const model = DataModelFields[modelName];
  const emptyObject: { [key: string]: any } = {};

  for (const [key, type] of Object.entries(model)) {
    switch (type) {
      case 'string':
        emptyObject[key] = '';
        break;
      case 'number':
        emptyObject[key] = 0;
        break;
      case 'boolean':
        emptyObject[key] = false;
        break;
      case 'datetime':
        emptyObject[key] = new Date();
        break;
      case 'string[]':
        emptyObject[key] = [];
        break;
      case 'any':
        emptyObject[key] = null;
        break;
      case 'image':
        emptyObject[key] = null;
        break;
      default:
        emptyObject[key] = null;
    }
  }

  return emptyObject as { [K in DataModelField<T>]: any };
}

export type UserRole = 'ADMIN' | 'USER' | 'MANAGER' | string;