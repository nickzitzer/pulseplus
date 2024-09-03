-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert field types
INSERT INTO field_types (name, label, ui_component, data_type, options) VALUES
('string', 'Text', 'input', 'string', '{"type": "text"}'),
('number', 'Number', 'input', 'number', '{"type": "number"}'),
('boolean', 'Checkbox', 'input', 'boolean', '{"type": "checkbox"}'),
('date', 'Date', 'input', 'date', '{"type": "date"}'),
('time', 'Time', 'input', 'time', '{"type": "time"}'),
('datetime', 'Date and Time', 'input', 'datetime', '{"type": "datetime-local"}'),
('email', 'Email', 'input', 'string', '{"type": "email"}'),
('url', 'URL', 'input', 'string', '{"type": "url"}'),
('phone', 'Phone Number', 'input', 'string', '{"type": "tel"}'),
('textarea', 'Long Text', 'textarea', 'string', '{}'),
('rich-text', 'Rich Text Editor', 'rich-text-editor', 'string', '{}'),
('select', 'Dropdown', 'select', 'string', '{}'),
('multi-select', 'Multi-Select', 'multi-select', 'array', '{}'),
('radio', 'Radio Buttons', 'radio-group', 'string', '{}'),
('checkbox-group', 'Checkbox Group', 'checkbox-group', 'array', '{}'),
('file', 'File Upload', 'file-upload', 'string', '{}'),
('image', 'Image Upload', 'image-upload', 'string', '{"accept": "image/*"}'),
('color', 'Color Picker', 'color-picker', 'string', '{}'),
('slider', 'Slider', 'slider', 'number', '{}'),
('rating', 'Rating', 'rating', 'number', '{}'),
('relation', 'Relation', 'relation-picker', 'uuid', '{}'),
('json', 'JSON', 'json-editor', 'jsonb', '{}'),
('code', 'Code Editor', 'code-editor', 'string', '{}'),
('markdown', 'Markdown Editor', 'markdown-editor', 'string', '{}'),
('location', 'Location (Lat/Long)', 'location-picker', 'jsonb', '{}'),
('currency', 'Currency', 'currency-input', 'number', '{}'),
('percentage', 'Percentage', 'percentage-input', 'number', '{}'),
('tags', 'Tags', 'tag-input', 'array', '{}');

-- Insert data models
INSERT INTO data_models (name, table_name, description) VALUES
('User', 'sys_user', 'Represents a user in the system'),
('Game', 'game', 'Represents a game in the platform'),
('Competition', 'competition', 'Represents a competition within a game'),
('Badge', 'badge', 'Represents a badge that can be earned');

-- Insert data model fields for User
DO $$
DECLARE
    user_model_id UUID;
BEGIN
    SELECT sys_id INTO user_model_id FROM data_models WHERE name = 'User';
    
    INSERT INTO data_model_fields (model_id, name, column_name, field_type_id, required, unique)
    VALUES
    (user_model_id, 'sys_id', 'sys_id', (SELECT sys_id FROM field_types WHERE name = 'string'), true, true),
    (user_model_id, 'user_name', 'user_name', (SELECT sys_id FROM field_types WHERE name = 'string'), true, true),
    (user_model_id, 'first_name', 'first_name', (SELECT sys_id FROM field_types WHERE name = 'string'), false, false),
    (user_model_id, 'last_name', 'last_name', (SELECT sys_id FROM field_types WHERE name = 'string'), false, false),
    (user_model_id, 'email', 'email', (SELECT sys_id FROM field_types WHERE name = 'email'), false, false),
    (user_model_id, 'active', 'active', (SELECT sys_id FROM field_types WHERE name = 'boolean'), false, false),
    (user_model_id, 'locked_out', 'locked_out', (SELECT sys_id FROM field_types WHERE name = 'boolean'), false, false),
    (user_model_id, 'password_hash', 'password_hash', (SELECT sys_id FROM field_types WHERE name = 'string'), false, false),
    (user_model_id, 'password_needs_reset', 'password_needs_reset', (SELECT sys_id FROM field_types WHERE name = 'boolean'), false, false),
    (user_model_id, 'last_login', 'last_login', (SELECT sys_id FROM field_types WHERE name = 'datetime'), false, false),
    (user_model_id, 'source', 'source', (SELECT sys_id FROM field_types WHERE name = 'string'), false, false),
    (user_model_id, 'role', 'role', (SELECT sys_id FROM field_types WHERE name = 'select'), false, false);
END $$;

-- Insert data model fields for Game
DO $$
DECLARE
    game_model_id UUID;
BEGIN
    SELECT sys_id INTO game_model_id FROM data_models WHERE name = 'Game';
    
    INSERT INTO data_model_fields (model_id, name, column_name, field_type_id, required, unique)
    VALUES
    (game_model_id, 'sys_id', 'sys_id', (SELECT sys_id FROM field_types WHERE name = 'string'), true, true),
    (game_model_id, 'number', 'number', (SELECT sys_id FROM field_types WHERE name = 'string'), true, true),
    (game_model_id, 'name', 'name', (SELECT sys_id FROM field_types WHERE name = 'string'), true, false),
    (game_model_id, 'description', 'description', (SELECT sys_id FROM field_types WHERE name = 'rich-text'), false, false),
    (game_model_id, 'gamemaster', 'gamemaster', (SELECT sys_id FROM field_types WHERE name = 'relation'), false, false),
    (game_model_id, 'image_url', 'image_url', (SELECT sys_id FROM field_types WHERE name = 'image'), false, false),
    (game_model_id, 'point_system', 'point_system', (SELECT sys_id FROM field_types WHERE name = 'relation'), false, false),
    (game_model_id, 'primary_color', 'primary_color', (SELECT sys_id FROM field_types WHERE name = 'color'), false, false),
    (game_model_id, 'secondary_color', 'secondary_color', (SELECT sys_id FROM field_types WHERE name = 'color'), false, false),
    (game_model_id, 'background_url', 'background_url', (SELECT sys_id FROM field_types WHERE name = 'image'), false, false),
    (game_model_id, 'competitor_group', 'competitor_group', (SELECT sys_id FROM field_types WHERE name = 'relation'), false, false),
    (game_model_id, 'active', 'active', (SELECT sys_id FROM field_types WHERE name = 'boolean'), false, false),
    (game_model_id, 'advance_percentage', 'advance_percentage', (SELECT sys_id FROM field_types WHERE name = 'percentage'), false, false),
    (game_model_id, 'recurring', 'recurring', (SELECT sys_id FROM field_types WHERE name = 'select'), false, false),
    (game_model_id, 'league_last_action', 'league_last_action', (SELECT sys_id FROM field_types WHERE name = 'datetime'), false, false),
    (game_model_id, 'kpi_data', 'kpi_data', (SELECT sys_id FROM field_types WHERE name = 'json'), false, false);
END $$;

-- Insert data model fields for Competition
DO $$
DECLARE
    competition_model_id UUID;
BEGIN
    SELECT sys_id INTO competition_model_id FROM data_models WHERE name = 'Competition';
    
    INSERT INTO data_model_fields (model_id, name, column_name, field_type_id, required, unique)
    VALUES
    (competition_model_id, 'sys_id', 'sys_id', (SELECT sys_id FROM field_types WHERE name = 'string'), true, true),
    (competition_model_id, 'number', 'number', (SELECT sys_id FROM field_types WHERE name = 'string'), true, true),
    (competition_model_id, 'name', 'name', (SELECT sys_id FROM field_types WHERE name = 'string'), true, false),
    (competition_model_id, 'description', 'description', (SELECT sys_id FROM field_types WHERE name = 'rich-text'), false, false),
    (competition_model_id, 'game', 'game', (SELECT sys_id FROM field_types WHERE name = 'relation'), true, false),
    (competition_model_id, 'start_date', 'start_date', (SELECT sys_id FROM field_types WHERE name = 'datetime'), false, false),
    (competition_model_id, 'end_date', 'end_date', (SELECT sys_id FROM field_types WHERE name = 'datetime'), false, false),
    (competition_model_id, 'competitor_group', 'competitor_group', (SELECT sys_id FROM field_types WHERE name = 'relation'), false, false),
    (competition_model_id, 'image_url', 'image_url', (SELECT sys_id FROM field_types WHERE name = 'image'), false, false),
    (competition_model_id, 'competition_type', 'competition_type', (SELECT sys_id FROM field_types WHERE name = 'select'), false, false),
    (competition_model_id, 'player_type', 'player_type', (SELECT sys_id FROM field_types WHERE name = 'select'), false, false),
    (competition_model_id, 'schedule_type', 'schedule_type', (SELECT sys_id FROM field_types WHERE name = 'select'), false, false),
    (competition_model_id, 'state', 'state', (SELECT sys_id FROM field_types WHERE name = 'number'), false, false),
    (competition_model_id, 'first_place_badge', 'first_place_badge', (SELECT sys_id FROM field_types WHERE name = 'relation'), false, false),
    (competition_model_id, 'second_place_badge', 'second_place_badge', (SELECT sys_id FROM field_types WHERE name = 'relation'), false, false),
    (competition_model_id, 'third_place_badge', 'third_place_badge', (SELECT sys_id FROM field_types WHERE name = 'relation'), false, false),
    (competition_model_id, 'achievements', 'achievements', (SELECT sys_id FROM field_types WHERE name = 'multi-select'), false, false),
    (competition_model_id, 'include_all_game_achievements', 'include_all_game_achievements', (SELECT sys_id FROM field_types WHERE name = 'boolean'), false, false),
    (competition_model_id, 'goal_points', 'goal_points', (SELECT sys_id FROM field_types WHERE name = 'number'), false, false),
    (competition_model_id, 'recurring', 'recurring', (SELECT sys_id FROM field_types WHERE name = 'select'), false, false),
    (competition_model_id, 'deadline', 'deadline', (SELECT sys_id FROM field_types WHERE name = 'datetime'), false, false);
END $$;

-- Insert data model fields for Badge
DO $$
DECLARE
    badge_model_id UUID;
BEGIN
    SELECT sys_id INTO badge_model_id FROM data_models WHERE name = 'Badge';
    
    INSERT INTO data_model_fields (model_id, name, column_name, field_type_id, required, unique)
    VALUES
    (badge_model_id, 'sys_id', 'sys_id', (SELECT sys_id FROM field_types WHERE name = 'string'), true, true),
    (badge_model_id, 'name', 'name', (SELECT sys_id FROM field_types WHERE name = 'string'), true, false),
    (badge_model_id, 'description', 'description', (SELECT sys_id FROM field_types WHERE name = 'rich-text'), false, false),
    (badge_model_id, 'image_url', 'image_url', (SELECT sys_id FROM field_types WHERE name = 'image'), false, false),
    (badge_model_id, 'color', 'color', (SELECT sys_id FROM field_types WHERE name = 'color'), false, false),
    (badge_model_id, 'game', 'game', (SELECT sys_id FROM field_types WHERE name = 'relation'), true, false);
END $$;

-- Insert data model relationships
INSERT INTO data_model_relationships (source_model_id, target_model_id, relationship_type, source_field_id, target_field_id)
VALUES
((SELECT sys_id FROM data_models WHERE name = 'Game'), (SELECT sys_id FROM data_models WHERE name = 'User'), 'many-to-one', 
 (SELECT sys_id FROM data_model_fields WHERE name = 'gamemaster' AND model_id = (SELECT sys_id FROM data_models WHERE name = 'Game')),
 (SELECT sys_id FROM data_model_fields WHERE name = 'sys_id' AND model_id = (SELECT sys_id FROM data_models WHERE name = 'User'))),

((SELECT sys_id FROM data_models WHERE name = 'Competition'), (SELECT sys_id FROM data_models WHERE name = 'Game'), 'many-to-one',
 (SELECT sys_id FROM data_model_fields WHERE name = 'game' AND model_id = (SELECT sys_id FROM data_models WHERE name = 'Competition')),
 (SELECT sys_id FROM data_model_fields WHERE name = 'sys_id' AND model_id = (SELECT sys_id FROM data_models WHERE name = 'Game'))),

((SELECT sys_id FROM data_models WHERE name = 'Badge'), (SELECT sys_id FROM data_models WHERE name = 'Game'), 'many-to-one',
 (SELECT sys_id FROM data_model_fields WHERE name = 'game' AND model_id = (SELECT sys_id FROM data_models WHERE name = 'Badge')),
 (SELECT sys_id FROM data_model_fields WHERE name = 'sys_id' AND model_id = (SELECT sys_id FROM data_models WHERE name = 'Game')));