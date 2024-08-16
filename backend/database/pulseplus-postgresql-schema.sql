-- Drop existing tables
DROP TABLE IF EXISTS goal_instance CASCADE;
DROP TABLE IF EXISTS achievement_competitor CASCADE;
DROP TABLE IF EXISTS kpi_instance CASCADE;
DROP TABLE IF EXISTS leaderboard_member CASCADE;
DROP TABLE IF EXISTS level_instance_member CASCADE;
DROP TABLE IF EXISTS badge_competitor CASCADE;
DROP TABLE IF EXISTS goal CASCADE;
DROP TABLE IF EXISTS team_competition CASCADE;
DROP TABLE IF EXISTS team CASCADE;
DROP TABLE IF EXISTS notifier CASCADE;
DROP TABLE IF EXISTS point_system CASCADE;
DROP TABLE IF EXISTS game CASCADE;
DROP TABLE IF EXISTS level CASCADE;
DROP TABLE IF EXISTS achievement CASCADE;
DROP TABLE IF EXISTS competitor CASCADE;
DROP TABLE IF EXISTS key_performance_indicator CASCADE;
DROP TABLE IF EXISTS level_instance CASCADE;
DROP TABLE IF EXISTS badge CASCADE;
DROP TABLE IF EXISTS kpi_instance_rollup CASCADE;
DROP TABLE IF EXISTS competition CASCADE;
DROP TABLE IF EXISTS sys_db_object CASCADE;
DROP TABLE IF EXISTS sys_user_group CASCADE;
DROP TABLE IF EXISTS department CASCADE;
DROP TABLE IF EXISTS chat_group CASCADE;
DROP TABLE IF EXISTS chat_message CASCADE;
DROP TABLE IF EXISTS chat_group_member CASCADE;
DROP TABLE IF EXISTS survey CASCADE;
DROP TABLE IF EXISTS survey_question CASCADE;
DROP TABLE IF EXISTS survey_response CASCADE;
DROP TABLE IF EXISTS notification_status CASCADE;
DROP TABLE IF EXISTS sys_user CASCADE;

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tables
CREATE TABLE sys_user (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(40) NOT NULL UNIQUE,
    first_name VARCHAR(40),
    last_name VARCHAR(40),
    email VARCHAR(100),
    active BOOLEAN,
    locked_out BOOLEAN,
    password_hash VARCHAR(255),
    password_needs_reset BOOLEAN,
    last_login TIMESTAMP,
    source VARCHAR(40),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40),
    department_id UUID,
    role VARCHAR(40)
);

CREATE TABLE sys_user_group (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(80) NOT NULL,
    description TEXT,
    active BOOLEAN,
    type VARCHAR(40),
    manager UUID REFERENCES sys_user(sys_id),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

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

CREATE TABLE competition (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(40),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(2000),
    game UUID,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    competitor_group UUID,
    image BYTEA,
    competition_type VARCHAR(40),
    player_type VARCHAR(40),
    schedule_type VARCHAR(40),
    state INTEGER,
    first_place_badge UUID,
    second_place_badge UUID,
    third_place_badge UUID,
    achievements UUID[],
    include_all_game_achievements BOOLEAN DEFAULT true,
    goal_points INTEGER,
    recurring VARCHAR(40),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40),
    deadline TIMESTAMP
);

CREATE TABLE kpi_instance_rollup (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(40),
    competitor UUID,
    kpi UUID,
    value NUMERIC DEFAULT 0,
    year INTEGER,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE badge (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    image BYTEA,
    color VARCHAR(40),
    game UUID NOT NULL,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE level_instance (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(40),
    level UUID,
    start_date DATE,
    end_date DATE,
    order_num INTEGER,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE key_performance_indicator (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    game UUID NOT NULL,
    type VARCHAR(40),
    aggregation VARCHAR(40),
    table_name VARCHAR(80),
    field VARCHAR(80),
    condition VARCHAR(4000),
    achievement UUID,
    order_num INTEGER DEFAULT 100,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE competitor (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    total_earnings DECIMAL(20,2) DEFAULT 0,
    account_balance DECIMAL(20,2) DEFAULT 0,
    performance_group VARCHAR(100),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40),
    avatar BYTEA,
    about_me TEXT
);

CREATE TABLE achievement (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(40),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(2000),
    game UUID NOT NULL,
    trigger_table VARCHAR(80),
    trigger_condition VARCHAR(4000),
    awardee VARCHAR(80),
    point_value INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    award_date VARCHAR(80),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE level (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(40),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    game UUID NOT NULL,
    competition UUID,
    type VARCHAR(40) DEFAULT 'league',
    image BYTEA,
    order_num INTEGER DEFAULT 100,
    color VARCHAR(40),
    entry_points INTEGER,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE game (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(40),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(2000),
    gamemaster UUID NOT NULL,
    image BYTEA,
    point_system UUID NOT NULL,
    primary_color VARCHAR(40),
    secondary_color VARCHAR(40),
    background BYTEA,
    competitor_group UUID,
    active BOOLEAN DEFAULT false,
    advance_percentage INTEGER DEFAULT 10,
    recurring VARCHAR(40) DEFAULT 'Weekly',
    league_last_action DATE,
    kpi_data VARCHAR(4000),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE point_system (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label VARCHAR(255),
    image BYTEA,
    dollar_conversion DECIMAL(20,2),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE notifier (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description VARCHAR(1000),
    receiver UUID NOT NULL,
    seen BOOLEAN,
    sender UUID,
    notification_type VARCHAR(40) DEFAULT 'success',
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40),
    type VARCHAR(50)
);

CREATE TABLE team (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    members UUID[] NOT NULL,
    image BYTEA,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE team_competition (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID,
    competition_id UUID,
    weight DECIMAL(20,2) DEFAULT 1,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE goal (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    game UUID NOT NULL,
    achievement UUID NOT NULL,
    recurring VARCHAR(40) DEFAULT 'Daily',
    target INTEGER NOT NULL,
    type VARCHAR(40) DEFAULT 'All competitors',
    competitors UUID[],
    active BOOLEAN DEFAULT true,
    color VARCHAR(40),
    last_action DATE,
    exclude_weekends BOOLEAN DEFAULT true,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE badge_competitor (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    badge_id UUID,
    competitor_id UUID,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE level_instance_member (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level_instance UUID,
    competitor UUID,
    points INTEGER,
    place INTEGER,
    league_change VARCHAR(40),
    level_order INTEGER,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE leaderboard_member (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition UUID,
    competitor UUID,
    competitor_type VARCHAR(80),
    points INTEGER,
    place INTEGER,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE kpi_instance (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(40),
    kpi UUID,
    competitor UUID,
    date DATE,
    value INTEGER DEFAULT 0,
    year VARCHAR(40),
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE achievement_competitor (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achievement_id UUID,
    competitor_id UUID,
    record_id UUID,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE goal_instance (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(40),
    goal UUID,
    competitor UUID,
    start_date DATE,
    end_date DATE,
    target INTEGER,
    value INTEGER DEFAULT 0,
    sys_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sys_created_by VARCHAR(40),
    sys_updated_by VARCHAR(40)
);

CREATE TABLE department (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE chat_group (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES sys_user(sys_id),
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_message (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_group_id UUID REFERENCES chat_group(sys_id),
    sender_id UUID REFERENCES sys_user(sys_id),
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_group_member (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_group_id UUID REFERENCES chat_group(sys_id),
    user_id UUID REFERENCES sys_user(sys_id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE survey (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE survey_question (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES survey(sys_id),
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    options JSON
);

CREATE TABLE survey_response (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES survey(sys_id),
    respondent_id UUID REFERENCES sys_user(sys_id),
    responses JSON,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_status (
    sys_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES notifier(sys_id),
    user_id UUID REFERENCES sys_user(sys_id),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP
);

-- Add foreign key constraints
ALTER TABLE sys_user ADD CONSTRAINT fk_sys_user_department FOREIGN KEY (department_id) REFERENCES department(sys_id);
ALTER TABLE competition ADD CONSTRAINT fk_competition_game FOREIGN KEY (game) REFERENCES game(sys_id);
ALTER TABLE competition ADD CONSTRAINT fk_competition_first_place_badge FOREIGN KEY (first_place_badge) REFERENCES badge(sys_id);
ALTER TABLE competition ADD CONSTRAINT fk_competition_second_place_badge FOREIGN KEY (second_place_badge) REFERENCES badge(sys_id);
ALTER TABLE competition ADD CONSTRAINT fk_competition_third_place_badge FOREIGN KEY (third_place_badge) REFERENCES badge(sys_id);
ALTER TABLE competition ADD CONSTRAINT fk_competition_competitor_group FOREIGN KEY (competitor_group) REFERENCES sys_user_group(sys_id);
ALTER TABLE kpi_instance_rollup ADD CONSTRAINT fk_kpi_instance_rollup_competitor FOREIGN KEY (competitor) REFERENCES competitor(sys_id);
ALTER TABLE kpi_instance_rollup ADD CONSTRAINT fk_kpi_instance_rollup_kpi FOREIGN KEY (kpi) REFERENCES key_performance_indicator(sys_id);
ALTER TABLE badge ADD CONSTRAINT fk_badge_game FOREIGN KEY (game) REFERENCES game(sys_id);
ALTER TABLE level_instance ADD CONSTRAINT fk_level_instance_level FOREIGN KEY (level) REFERENCES level(sys_id);
ALTER TABLE key_performance_indicator ADD CONSTRAINT fk_key_performance_indicator_game FOREIGN KEY (game) REFERENCES game(sys_id);
ALTER TABLE key_performance_indicator ADD CONSTRAINT fk_key_performance_indicator_achievement FOREIGN KEY (achievement) REFERENCES achievement(sys_id);
ALTER TABLE key_performance_indicator ADD CONSTRAINT fk_key_performance_indicator_table_name FOREIGN KEY (table_name) REFERENCES sys_db_object(name);
ALTER TABLE competitor ADD CONSTRAINT fk_competitor_user_id FOREIGN KEY (user_id) REFERENCES sys_user(sys_id);
ALTER TABLE achievement ADD CONSTRAINT fk_achievement_game FOREIGN KEY (game) REFERENCES game(sys_id);
ALTER TABLE achievement ADD CONSTRAINT fk_achievement_trigger_table FOREIGN KEY (trigger_table) REFERENCES sys_db_object(name);
ALTER TABLE level ADD CONSTRAINT fk_level_game FOREIGN KEY (game) REFERENCES game(sys_id);
ALTER TABLE level ADD CONSTRAINT fk_level_competition FOREIGN KEY (competition) REFERENCES competition(sys_id);
ALTER TABLE game ADD CONSTRAINT fk_game_gamemaster FOREIGN KEY (gamemaster) REFERENCES sys_user(sys_id);
ALTER TABLE game ADD CONSTRAINT fk_game_point_system FOREIGN KEY (point_system) REFERENCES point_system(sys_id);
ALTER TABLE game ADD CONSTRAINT fk_game_competitor_group FOREIGN KEY (competitor_group) REFERENCES sys_user_group(sys_id);
ALTER TABLE notifier ADD CONSTRAINT fk_notifier_receiver FOREIGN KEY (receiver) REFERENCES sys_user(sys_id);
ALTER TABLE notifier ADD CONSTRAINT fk_notifier_sender FOREIGN KEY (sender) REFERENCES sys_user(sys_id);
ALTER TABLE team_competition ADD CONSTRAINT fk_team_competition_team_id FOREIGN KEY (team_id) REFERENCES team(sys_id);
ALTER TABLE team_competition ADD CONSTRAINT fk_team_competition_competition_id FOREIGN KEY (competition_id) REFERENCES competition(sys_id);
ALTER TABLE goal ADD CONSTRAINT fk_goal_game FOREIGN KEY (game) REFERENCES game(sys_id);
ALTER TABLE goal ADD CONSTRAINT fk_goal_achievement FOREIGN KEY (achievement) REFERENCES achievement(sys_id);
ALTER TABLE badge_competitor ADD CONSTRAINT fk_badge_competitor_badge_id FOREIGN KEY (badge_id) REFERENCES badge(sys_id);
ALTER TABLE badge_competitor ADD CONSTRAINT fk_badge_competitor_competitor_id FOREIGN KEY (competitor_id) REFERENCES competitor(sys_id);
ALTER TABLE level_instance_member ADD CONSTRAINT fk_level_instance_member_level_instance FOREIGN KEY (level_instance) REFERENCES level_instance(sys_id);
ALTER TABLE level_instance_member ADD CONSTRAINT fk_level_instance_member_competitor FOREIGN KEY (competitor) REFERENCES competitor(sys_id);
ALTER TABLE leaderboard_member ADD CONSTRAINT fk_leaderboard_member_competition FOREIGN KEY (competition) REFERENCES competition(sys_id);
ALTER TABLE leaderboard_member ADD CONSTRAINT fk_leaderboard_member_competitor FOREIGN KEY (competitor) REFERENCES competitor(sys_id);
ALTER TABLE kpi_instance ADD CONSTRAINT fk_kpi_instance_kpi FOREIGN KEY (kpi) REFERENCES key_performance_indicator(sys_id);
ALTER TABLE kpi_instance ADD CONSTRAINT fk_kpi_instance_competitor FOREIGN KEY (competitor) REFERENCES competitor(sys_id);
ALTER TABLE achievement_competitor ADD CONSTRAINT fk_achievement_competitor_achievement_id FOREIGN KEY (achievement_id) REFERENCES achievement(sys_id);
ALTER TABLE achievement_competitor ADD CONSTRAINT fk_achievement_competitor_competitor_id FOREIGN KEY (competitor_id) REFERENCES competitor(sys_id);
ALTER TABLE goal_instance ADD CONSTRAINT fk_goal_instance_goal FOREIGN KEY (goal) REFERENCES goal(sys_id);
ALTER TABLE goal_instance ADD CONSTRAINT fk_goal_instance_competitor FOREIGN KEY (competitor) REFERENCES competitor(sys_id);

-- Create indexes
CREATE INDEX idx_sys_user_username ON sys_user(user_name);
CREATE INDEX idx_competitor_user_id ON competitor(user_id);
CREATE INDEX idx_game_name ON game(name);
CREATE INDEX idx_competition_game ON competition(game);
CREATE INDEX idx_achievement_game ON achievement(game);
CREATE INDEX idx_kpi_game ON key_performance_indicator(game);
CREATE INDEX idx_leaderboard_competition ON leaderboard_member(competition);
CREATE INDEX idx_chat_message_group ON chat_message(chat_group_id);
CREATE INDEX idx_survey_response_survey ON survey_response(survey_id);