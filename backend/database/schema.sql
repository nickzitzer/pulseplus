-- PulsePlus Consolidated Database Schema
-- This file contains the complete database schema for the PulsePlus application

-- Begin transaction
BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS maintenance;
CREATE SCHEMA IF NOT EXISTS cron;

-- =============================================
-- Table Definitions
-- =============================================

-- Department table
CREATE TABLE department (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- SSO Provider table
CREATE TABLE sso_provider (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    single_sign_on_service VARCHAR(255) NOT NULL,
    single_logout_service VARCHAR(255),
    certificate TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User table
CREATE TABLE sys_user (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(40) NOT NULL UNIQUE,
    first_name VARCHAR(40),
    last_name VARCHAR(40),
    email VARCHAR(100),
    active BOOLEAN DEFAULT true,
    locked_out BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),
    password_needs_reset BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    source VARCHAR(40),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40),
    department_id UUID REFERENCES department(sys_id) ON DELETE SET NULL,
    role VARCHAR(40),
    sso_provider_id UUID REFERENCES sso_provider(sys_id),
    sso_user_id VARCHAR(255),
    avatar_url VARCHAR(255),
    -- Password policy fields
    password_updated_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE
);

-- Password History table for password policy
CREATE TABLE password_history (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES sys_user(sys_id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- User Group table
CREATE TABLE sys_user_group (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(80) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    type VARCHAR(40),
    manager UUID REFERENCES sys_user(sys_id),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

-- Database Object table
CREATE TABLE sys_db_object (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(80) NOT NULL UNIQUE,
    label VARCHAR(80),
    sys_package UUID,
    is_extendable BOOLEAN,
    sys_class_name VARCHAR(80),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

-- Point System table
CREATE TABLE point_system (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label VARCHAR(255),
    image_url VARCHAR(255),
    dollar_conversion DECIMAL(20,2),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

-- Game table
CREATE TABLE game (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(40),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(2000),
    gamemaster UUID NOT NULL,
    image_url VARCHAR(255),
    point_system UUID,
    primary_color VARCHAR(40),
    secondary_color VARCHAR(40),
    background_url VARCHAR(255),
    competitor_group UUID,
    active BOOLEAN DEFAULT false,
    advance_percentage INTEGER DEFAULT 10,
    recurring VARCHAR(40) DEFAULT 'Weekly',
    league_last_action DATE,
    kpi_data VARCHAR(4000),
    currency_name VARCHAR(100),
    currency_conversion DECIMAL(10,4),
    is_active BOOLEAN DEFAULT true,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40),
    FOREIGN KEY (gamemaster) REFERENCES sys_user(sys_id) ON DELETE RESTRICT,
    FOREIGN KEY (point_system) REFERENCES point_system(sys_id),
    FOREIGN KEY (competitor_group) REFERENCES sys_user_group(sys_id)
);

-- Season table
CREATE TABLE season (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    theme VARCHAR(100),
    battle_pass_enabled BOOLEAN DEFAULT true,
    current_season BOOLEAN DEFAULT false,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE CASCADE
);

-- Season Tier table
CREATE TABLE season_tier (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL,
    tier_level INTEGER NOT NULL,
    xp_required INTEGER NOT NULL,
    free_rewards JSONB,
    premium_rewards JSONB,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES season(sys_id) ON DELETE CASCADE
);

-- Virtual Currency table
CREATE TABLE virtual_currency (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    currency_name VARCHAR(100) NOT NULL,
    currency_symbol VARCHAR(10) NOT NULL,
    exchange_rate DECIMAL(10,4) NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE CASCADE
);

-- Reward Shop table
CREATE TABLE reward_shop (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    currency_id UUID NOT NULL,
    refresh_interval VARCHAR(20) DEFAULT 'WEEKLY',
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (currency_id) REFERENCES virtual_currency(sys_id) ON DELETE RESTRICT
);

-- Shop Item table
CREATE TABLE shop_item (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,4) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    rarity VARCHAR(50) NOT NULL,
    stock_quantity INTEGER,
    image_url VARCHAR(255),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES reward_shop(sys_id) ON DELETE CASCADE
);

-- Competitor table
CREATE TABLE competitor (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    game_id UUID NOT NULL,
    total_points INTEGER DEFAULT 0,
    current_balance INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    current_xp INTEGER DEFAULT 0,
    total_earnings DECIMAL(20,2) DEFAULT 0,
    account_balance DECIMAL(20,2) DEFAULT 0,
    performance_group VARCHAR(100),
    avatar_url VARCHAR(255),
    about_me TEXT,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40),
    FOREIGN KEY (user_id) REFERENCES sys_user(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE CASCADE,
    UNIQUE(user_id, game_id)
);

-- Season Pass Progress table
CREATE TABLE season_pass_progress (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID NOT NULL,
    season_id UUID NOT NULL,
    current_tier INTEGER DEFAULT 1,
    current_xp INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competitor_id) REFERENCES competitor(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES season(sys_id) ON DELETE CASCADE,
    UNIQUE(competitor_id, season_id)
);

-- Currency Balance table
CREATE TABLE currency_balance (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID NOT NULL,
    currency_id UUID NOT NULL,
    balance DECIMAL(20,4) DEFAULT 0,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competitor_id) REFERENCES competitor(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (currency_id) REFERENCES virtual_currency(sys_id) ON DELETE CASCADE,
    UNIQUE(competitor_id, currency_id)
);

-- Quest table
CREATE TABLE quest (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty_level INTEGER DEFAULT 1,
    required_level INTEGER DEFAULT 1,
    reward_type VARCHAR(50) NOT NULL,
    reward_amount INTEGER NOT NULL,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    repeatable BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE CASCADE
);

-- Quest Objective table
CREATE TABLE quest_objective (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quest_id UUID NOT NULL,
    objective_type VARCHAR(50) NOT NULL,
    target_amount INTEGER NOT NULL,
    description TEXT,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quest_id) REFERENCES quest(sys_id) ON DELETE CASCADE
);

-- Powerup table
CREATE TABLE powerup (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    effect_type VARCHAR(50) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    multiplier DECIMAL(5,2) NOT NULL,
    image_url VARCHAR(255),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE CASCADE
);

-- Achievement table
CREATE TABLE achievement (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(40),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(2000),
    game_id UUID NOT NULL,
    trigger_table VARCHAR(80),
    trigger_condition VARCHAR(4000),
    awardee VARCHAR(80),
    point_value INTEGER DEFAULT 0,
    xp_value INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    award_date VARCHAR(80),
    image_url VARCHAR(255),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40),
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE CASCADE
);

-- Badge table
CREATE TABLE badge (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    award_criteria JSONB,
    xp_value INTEGER DEFAULT 0,
    rarity VARCHAR(50),
    color VARCHAR(40),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40),
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE CASCADE
);

-- Achievement Competitor junction table
CREATE TABLE achievement_competitor (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achievement_id UUID NOT NULL,
    competitor_id UUID NOT NULL,
    record_id UUID,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40),
    FOREIGN KEY (achievement_id) REFERENCES achievement(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (competitor_id) REFERENCES competitor(sys_id) ON DELETE CASCADE,
    UNIQUE(achievement_id, competitor_id)
);

-- Badge Competitor junction table
CREATE TABLE badge_competitor (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    badge_id UUID NOT NULL,
    competitor_id UUID NOT NULL,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40),
    FOREIGN KEY (badge_id) REFERENCES badge(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (competitor_id) REFERENCES competitor(sys_id) ON DELETE CASCADE,
    UNIQUE(badge_id, competitor_id)
);

-- Team table
CREATE TABLE team (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    leader_id UUID NOT NULL,
    max_members INTEGER DEFAULT 10,
    image_url VARCHAR(255),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40),
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (leader_id) REFERENCES sys_user(sys_id) ON DELETE RESTRICT
);

-- Team Member junction table
CREATE TABLE team_member (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL,
    competitor_id UUID NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(50) DEFAULT 'MEMBER',
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES team(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (competitor_id) REFERENCES competitor(sys_id) ON DELETE CASCADE,
    UNIQUE(team_id, competitor_id)
);

-- Leaderboard table
CREATE TABLE leaderboard (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    reset_frequency VARCHAR(50) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE CASCADE
);

-- Leaderboard Entry table
CREATE TABLE leaderboard_entry (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leaderboard_id UUID NOT NULL,
    competitor_id UUID,
    team_id UUID,
    score INTEGER DEFAULT 0,
    rank INTEGER,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leaderboard_id) REFERENCES leaderboard(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (competitor_id) REFERENCES competitor(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES team(sys_id) ON DELETE CASCADE,
    CHECK ((competitor_id IS NOT NULL AND team_id IS NULL) OR (competitor_id IS NULL AND team_id IS NOT NULL))
);

-- Daily Challenge table
CREATE TABLE daily_challenge (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    challenge_date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    reward_type VARCHAR(50) NOT NULL,
    reward_amount INTEGER NOT NULL,
    difficulty VARCHAR(50) DEFAULT 'MEDIUM',
    active BOOLEAN DEFAULT true,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE CASCADE
);

-- Competition table
CREATE TABLE competition (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    competition_type VARCHAR(50) DEFAULT 'INDIVIDUAL',
    status VARCHAR(50) DEFAULT 'UPCOMING',
    reward_description TEXT,
    image_url VARCHAR(255),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE CASCADE
);

-- Team Competition junction table
CREATE TABLE team_competition (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL,
    competition_id UUID NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES team(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (competition_id) REFERENCES competition(sys_id) ON DELETE CASCADE,
    UNIQUE(team_id, competition_id)
);

-- Notification table
CREATE TABLE notification (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    link VARCHAR(255),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sys_user(sys_id) ON DELETE CASCADE
);

-- Chat Group table
CREATE TABLE chat_group (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_direct BOOLEAN DEFAULT false,
    game_id UUID,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES sys_user(sys_id),
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE SET NULL
);

-- Chat Message table
CREATE TABLE chat_message (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_group_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_system_message BOOLEAN DEFAULT false,
    attachment_url VARCHAR(255),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_group_id) REFERENCES chat_group(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES sys_user(sys_id) ON DELETE CASCADE
);

-- Chat Group Member table
CREATE TABLE chat_group_member (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(50) DEFAULT 'MEMBER',
    last_read_message_id UUID,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_group_id) REFERENCES chat_group(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES sys_user(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (last_read_message_id) REFERENCES chat_message(sys_id) ON DELETE SET NULL,
    UNIQUE(chat_group_id, user_id)
);

-- Survey table
CREATE TABLE survey (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    game_id UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game(sys_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES sys_user(sys_id)
);

-- Survey Question table
CREATE TABLE survey_question (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    options JSONB,
    required BOOLEAN DEFAULT true,
    order_num INTEGER,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (survey_id) REFERENCES survey(sys_id) ON DELETE CASCADE
);

-- Survey Response table
CREATE TABLE survey_response (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL,
    respondent_id UUID NOT NULL,
    responses JSONB NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (survey_id) REFERENCES survey(sys_id) ON DELETE CASCADE,
    FOREIGN KEY (respondent_id) REFERENCES sys_user(sys_id) ON DELETE CASCADE
);

-- Audit Log table
CREATE TABLE audit_log (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID,
    target_table VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sys_user(sys_id) ON DELETE SET NULL
);

-- =============================================
-- Indexes for performance optimization
-- =============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_sys_user_email ON sys_user(email);
CREATE INDEX IF NOT EXISTS idx_sys_user_username ON sys_user(user_name);
CREATE INDEX IF NOT EXISTS idx_sys_user_department ON sys_user(department_id);
CREATE INDEX IF NOT EXISTS idx_sys_user_role ON sys_user(role);
CREATE INDEX IF NOT EXISTS idx_sys_user_active ON sys_user(active);

-- Password history index
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);

-- Game indexes
CREATE INDEX IF NOT EXISTS idx_game_gamemaster ON game(gamemaster);
CREATE INDEX IF NOT EXISTS idx_game_is_active ON game(is_active);
CREATE INDEX IF NOT EXISTS idx_game_name ON game(name);

-- Season indexes
CREATE INDEX IF NOT EXISTS idx_season_game_id ON season(game_id);
CREATE INDEX IF NOT EXISTS idx_season_current_season ON season(current_season);
CREATE INDEX IF NOT EXISTS idx_season_dates ON season(start_date, end_date);

-- Season tier indexes
CREATE INDEX IF NOT EXISTS idx_season_tier_season_id ON season_tier(season_id);
CREATE INDEX IF NOT EXISTS idx_season_tier_level ON season_tier(tier_level);

-- Virtual currency indexes
CREATE INDEX IF NOT EXISTS idx_virtual_currency_game_id ON virtual_currency(game_id);
CREATE INDEX IF NOT EXISTS idx_virtual_currency_name ON virtual_currency(currency_name);
CREATE INDEX IF NOT EXISTS idx_virtual_currency_premium ON virtual_currency(is_premium);

-- Reward shop indexes
CREATE INDEX IF NOT EXISTS idx_reward_shop_game_id ON reward_shop(game_id);
CREATE INDEX IF NOT EXISTS idx_reward_shop_currency_id ON reward_shop(currency_id);

-- Shop item indexes
CREATE INDEX IF NOT EXISTS idx_shop_item_shop_id ON shop_item(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_item_item_type ON shop_item(item_type);
CREATE INDEX IF NOT EXISTS idx_shop_item_rarity ON shop_item(rarity);

-- Competitor indexes
CREATE INDEX IF NOT EXISTS idx_competitor_user_id ON competitor(user_id);
CREATE INDEX IF NOT EXISTS idx_competitor_game_id ON competitor(game_id);
CREATE INDEX IF NOT EXISTS idx_competitor_level ON competitor(level);

-- Season pass progress indexes
CREATE INDEX IF NOT EXISTS idx_season_pass_progress_competitor ON season_pass_progress(competitor_id);
CREATE INDEX IF NOT EXISTS idx_season_pass_progress_season ON season_pass_progress(season_id);
CREATE INDEX IF NOT EXISTS idx_season_pass_progress_premium ON season_pass_progress(is_premium);

-- Currency balance indexes
CREATE INDEX IF NOT EXISTS idx_currency_balance_competitor ON currency_balance(competitor_id);
CREATE INDEX IF NOT EXISTS idx_currency_balance_currency ON currency_balance(currency_id);

-- Quest indexes
CREATE INDEX IF NOT EXISTS idx_quest_game_id ON quest(game_id);
CREATE INDEX IF NOT EXISTS idx_quest_difficulty ON quest(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_quest_required_level ON quest(required_level);

-- Quest objective indexes
CREATE INDEX IF NOT EXISTS idx_quest_objective_quest_id ON quest_objective(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_objective_type ON quest_objective(objective_type);

-- Powerup indexes
CREATE INDEX IF NOT EXISTS idx_powerup_game_id ON powerup(game_id);
CREATE INDEX IF NOT EXISTS idx_powerup_effect_type ON powerup(effect_type);

-- Achievement indexes
CREATE INDEX IF NOT EXISTS idx_achievement_game_id ON achievement(game_id);

-- Badge indexes
CREATE INDEX IF NOT EXISTS idx_badge_game_id ON badge(game_id);
CREATE INDEX IF NOT EXISTS idx_badge_rarity ON badge(rarity);

-- Team indexes
CREATE INDEX IF NOT EXISTS idx_team_game_id ON team(game_id);
CREATE INDEX IF NOT EXISTS idx_team_leader_id ON team(leader_id);

-- Leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_game_id ON leaderboard(game_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_type ON leaderboard(type);
CREATE INDEX IF NOT EXISTS idx_leaderboard_reset_frequency ON leaderboard(reset_frequency);

-- Daily challenge indexes
CREATE INDEX IF NOT EXISTS idx_daily_challenge_game_id ON daily_challenge(game_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_date ON daily_challenge(challenge_date);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_difficulty ON daily_challenge(difficulty);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_type ON notification(type);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_table ON audit_log(target_table);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);

-- =============================================
-- End of schema definition
-- =============================================

-- Commit transaction
COMMIT; 