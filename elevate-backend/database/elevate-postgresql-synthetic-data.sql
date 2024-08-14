CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Insert departments
INSERT INTO department (sys_id, name, description) VALUES
(uuid_generate_v4(), 'Sales', 'Sales and marketing department'),
(uuid_generate_v4(), 'Engineering', 'Software development and IT operations'),
(uuid_generate_v4(), 'Human Resources', 'Employee management and recruitment'),
(uuid_generate_v4(), 'Finance', 'Financial planning and accounting');

-- Insert users with encrypted passwords
INSERT INTO sys_user (sys_id, user_name, first_name, last_name, email, active, department_id, password_hash) VALUES
(uuid_generate_v4(), 'john.doe', 'John', 'Doe', 'john.doe@example.com', true, (SELECT sys_id FROM department WHERE name = 'Sales'), crypt('john.doe', gen_salt('bf', 10))),
(uuid_generate_v4(), 'jane.smith', 'Jane', 'Smith', 'jane.smith@example.com', true, (SELECT sys_id FROM department WHERE name = 'Engineering'), crypt('jane.smith', gen_salt('bf', 10))),
(uuid_generate_v4(), 'bob.johnson', 'Bob', 'Johnson', 'bob.johnson@example.com', true, (SELECT sys_id FROM department WHERE name = 'Human Resources'), crypt('bob.johnson', gen_salt('bf', 10))),
(uuid_generate_v4(), 'alice.williams', 'Alice', 'Williams', 'alice.williams@example.com', true, (SELECT sys_id FROM department WHERE name = 'Finance'), crypt('alice.williams', gen_salt('bf', 10)));
-- Insert point systems
INSERT INTO point_system (sys_id, label, dollar_conversion) VALUES
(uuid_generate_v4(), 'Standard Points', 0.01),
(uuid_generate_v4(), 'Premium Points', 0.02);

-- Insert games
INSERT INTO game (sys_id, number, name, description, gamemaster, point_system, active) VALUES
(uuid_generate_v4(), 'GAME001', 'Sales Challenge 2024', 'Boost your sales performance and climb the leaderboard!', (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), (SELECT sys_id FROM point_system WHERE label = 'Standard Points'), true),
(uuid_generate_v4(), 'GAME002', 'Code Masters', 'Showcase your coding skills and solve challenging problems!', (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), (SELECT sys_id FROM point_system WHERE label = 'Premium Points'), true);

-- Insert competitors
INSERT INTO competitor (sys_id, user_id, total_earnings, account_balance, performance_group, about_me) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), 5000, 1000, 'High Performers', 'Enthusiastic sales professional with a passion for exceeding targets.'),
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), 4500, 900, 'High Performers', 'Innovative software engineer always looking for the next big challenge.'),
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'bob.johnson'), 3000, 600, 'Mid Performers', 'Dedicated HR specialist focused on creating a positive work environment.'),
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'alice.williams'), 3500, 700, 'Mid Performers', 'Detail-oriented finance expert with a knack for spotting trends.');

-- Insert competitions
INSERT INTO competition (sys_id, number, name, description, game, start_date, end_date, competition_type, player_type, deadline) VALUES
(uuid_generate_v4(), 'COMP001', 'Q2 Sales Sprint', 'Race to close the most deals in Q2', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), '2024-04-01', '2024-06-30', 'Individual', 'Solo', '2024-06-30 23:59:59'),
(uuid_generate_v4(), 'COMP002', 'Hackathon 2024', 'Build an innovative app in 48 hours', (SELECT sys_id FROM game WHERE name = 'Code Masters'), '2024-07-15', '2024-07-17', 'Team', 'Group', '2024-07-17 23:59:59');

-- Insert chat groups
INSERT INTO chat_group (sys_id, name, created_by) VALUES
(uuid_generate_v4(), 'Sales Team Chat', (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe')),
(uuid_generate_v4(), 'Engineering Team Chat', (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'));

-- Insert chat messages
INSERT INTO chat_message (sys_id, chat_group_id, sender_id, content) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM chat_group WHERE name = 'Sales Team Chat'), (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), 'Hey team, let''s crush our targets this quarter!'),
(uuid_generate_v4(), (SELECT sys_id FROM chat_group WHERE name = 'Engineering Team Chat'), (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), 'Who''s up for a coding challenge this weekend?');

-- Insert chat group members
INSERT INTO chat_group_member (sys_id, chat_group_id, user_id) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM chat_group WHERE name = 'Sales Team Chat'), (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe')),
(uuid_generate_v4(), (SELECT sys_id FROM chat_group WHERE name = 'Sales Team Chat'), (SELECT sys_id FROM sys_user WHERE user_name = 'alice.williams')),
(uuid_generate_v4(), (SELECT sys_id FROM chat_group WHERE name = 'Engineering Team Chat'), (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith')),
(uuid_generate_v4(), (SELECT sys_id FROM chat_group WHERE name = 'Engineering Team Chat'), (SELECT sys_id FROM sys_user WHERE user_name = 'bob.johnson'));

-- Insert surveys
INSERT INTO survey (sys_id, title, description) VALUES
(uuid_generate_v4(), 'Employee Satisfaction Survey', 'Help us improve your work experience'),
(uuid_generate_v4(), 'Game Feedback Survey', 'Share your thoughts on our gamification platform');

-- Insert survey questions
INSERT INTO survey_question (sys_id, survey_id, question_text, question_type, options) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM survey WHERE title = 'Employee Satisfaction Survey'), 'How satisfied are you with your current role?', 'rating', NULL),
(uuid_generate_v4(), (SELECT sys_id FROM survey WHERE title = 'Employee Satisfaction Survey'), 'What aspects of your job do you enjoy the most?', 'multiple_choice', '["Teamwork", "Challenges", "Learning Opportunities", "Work-Life Balance"]'),
(uuid_generate_v4(), (SELECT sys_id FROM survey WHERE title = 'Game Feedback Survey'), 'Which game features do you find most engaging?', 'multiple_choice', '["Leaderboards", "Achievements", "Challenges", "Rewards"]'),
(uuid_generate_v4(), (SELECT sys_id FROM survey WHERE title = 'Game Feedback Survey'), 'Do you have any suggestions for improving our platform?', 'text', NULL);

-- Insert badges
INSERT INTO badge (sys_id, name, description, color, game) VALUES
(uuid_generate_v4(), 'Sales Superstar', 'Awarded for exceptional sales performance', '#FFD700', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024')),
(uuid_generate_v4(), 'Code Ninja', 'Awarded for solving complex coding challenges', '#4B0082', (SELECT sys_id FROM game WHERE name = 'Code Masters'));

-- Insert achievements
INSERT INTO achievement (sys_id, number, name, description, game, point_value) VALUES
(uuid_generate_v4(), 'ACH001', 'First Sale', 'Complete your first sale', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 100),
(uuid_generate_v4(), 'ACH002', 'Bug Squasher', 'Fix 10 critical bugs', (SELECT sys_id FROM game WHERE name = 'Code Masters'), 200);

-- Insert KPIs
INSERT INTO key_performance_indicator (sys_id, name, description, game, type, aggregation) VALUES
(uuid_generate_v4(), 'Total Sales', 'Total sales amount in dollars', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'numeric', 'sum'),
(uuid_generate_v4(), 'Code Quality', 'Average code quality score', (SELECT sys_id FROM game WHERE name = 'Code Masters'), 'numeric', 'average');

-- Insert KPI instances
INSERT INTO kpi_instance (sys_id, kpi, competitor, date, value, year) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM key_performance_indicator WHERE name = 'Total Sales'), (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe')), '2024-05-15', 50000, '2024'),
(uuid_generate_v4(), (SELECT sys_id FROM key_performance_indicator WHERE name = 'Code Quality'), (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith')), '2024-05-15', 95, '2024');

-- Insert notifications
INSERT INTO notifier (sys_id, description, receiver, seen, sender, notification_type, type) VALUES
(uuid_generate_v4(), 'Congratulations! You''ve earned the Sales Superstar badge!', (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), false, NULL, 'success', 'achievement'),
(uuid_generate_v4(), 'New coding challenge available: Algorithmic Showdown', (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), false, NULL, 'info', 'challenge');

-- Insert notification status
INSERT INTO notification_status (sys_id, notification_id, user_id, read) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM notifier WHERE description LIKE 'Congratulations! You''ve earned the Sales Superstar badge!'), (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), false),
(uuid_generate_v4(), (SELECT sys_id FROM notifier WHERE description LIKE 'New coding challenge available: Algorithmic Showdown'), (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), false);

-- Insert goals
INSERT INTO goal (sys_id, name, description, game, achievement, recurring, target, type, active, color) VALUES
(uuid_generate_v4(), 'Weekly Sales Target', 'Achieve $10,000 in sales this week', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), (SELECT sys_id FROM achievement WHERE name = 'First Sale'), 'Weekly', 10000, 'All competitors', true, '#1F8476'),
(uuid_generate_v4(), 'Daily Coding Practice', 'Solve at least one coding problem every day', (SELECT sys_id FROM game WHERE name = 'Code Masters'), (SELECT sys_id FROM achievement WHERE name = 'Bug Squasher'), 'Daily', 1, 'All competitors', true, '#6ABECF');

-- Insert levels
INSERT INTO level (sys_id, number, name, description, game, type, order_num, color, entry_points) VALUES
(uuid_generate_v4(), 'LVL001', 'Bronze League', 'Entry level for all competitors', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'league', 1, '#CD7F32', 0),
(uuid_generate_v4(), 'LVL002', 'Silver League', 'Intermediate level for consistent performers', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'league', 2, '#C0C0C0', 1000),
(uuid_generate_v4(), 'LVL003', 'Gold League', 'Advanced level for top performers', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'league', 3, '#FFD700', 5000);

-- Insert level instances
INSERT INTO level_instance (sys_id, level, start_date, end_date, order_num) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM level WHERE name = 'Bronze League'), '2024-01-01', '2024-03-31', 1),
(uuid_generate_v4(), (SELECT sys_id FROM level WHERE name = 'Silver League'), '2024-04-01', '2024-06-30', 2),
(uuid_generate_v4(), (SELECT sys_id FROM level WHERE name = 'Gold League'), '2024-07-01', '2024-09-30', 3);

-- Insert level instance members
INSERT INTO level_instance_member (sys_id, level_instance, competitor, points, place, league_change, level_order) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM level_instance WHERE order_num = 2), (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe')), 1500, 1, 'up', 2),
(uuid_generate_v4(), (SELECT sys_id FROM level_instance WHERE order_num = 1), (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith')), 800, 2, 'same', 1);

-- Insert leaderboard members
INSERT INTO leaderboard_member (sys_id, competition, competitor, competitor_type, points, place) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM competition WHERE name = 'Q2 Sales Sprint'), (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe')), 'individual', 1500, 1),
(uuid_generate_v4(), (SELECT sys_id FROM competition WHERE name = 'Q2 Sales Sprint'), (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'alice.williams')), 'individual', 1300, 2);

-- Insert some badge_competitor associations
INSERT INTO badge_competitor (sys_id, badge_id, competitor_id) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM badge WHERE name = 'Sales Superstar'), (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'))),
(uuid_generate_v4(), (SELECT sys_id FROM badge WHERE name = 'Code Ninja'), (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith')));

-- Insert some achievement_competitor associations
INSERT INTO achievement_competitor (sys_id, achievement_id, competitor_id) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM achievement WHERE name = 'First Sale'), (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'))),
(uuid_generate_v4(), (SELECT sys_id FROM achievement WHERE name = 'Bug Squasher'), (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith')));

-- Insert some goal instances
INSERT INTO goal_instance (sys_id, number, goal, competitor, start_date, end_date, target, value) VALUES
(uuid_generate_v4(), 'GI001', (SELECT sys_id FROM goal WHERE name = 'Weekly Sales Target'), (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe')), '2024-05-01', '2024-05-07', 10000, 8000),
(uuid_generate_v4(), 'GI002', (SELECT sys_id FROM goal WHERE name = 'Daily Coding Practice'), (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith')), '2024-05-01', '2024-05-01', 1, 1);

-- Insert some team data
INSERT INTO team (sys_id, name, members) VALUES
(uuid_generate_v4(), 'Alpha Sales Team', ARRAY[(SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), (SELECT sys_id FROM sys_user WHERE user_name = 'alice.williams')]),
(uuid_generate_v4(), 'Beta Dev Team', ARRAY[(SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), (SELECT sys_id FROM sys_user WHERE user_name = 'bob.johnson')]);

-- Insert some team competition data
INSERT INTO team_competition (sys_id, team_id, competition_id) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM team WHERE name = 'Alpha Sales Team'), (SELECT sys_id FROM competition WHERE name = 'Q2 Sales Sprint')),
(uuid_generate_v4(), (SELECT sys_id FROM team WHERE name = 'Beta Dev Team'), (SELECT sys_id FROM competition WHERE name = 'Hackathon 2024'));

-- Insert some survey responses
INSERT INTO survey_response (sys_id, survey_id, respondent_id, responses) VALUES
(uuid_generate_v4(), 
 (SELECT sys_id FROM survey WHERE title = 'Employee Satisfaction Survey'), 
 (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'),
 '{"How satisfied are you with your current role?": 4, "What aspects of your job do you enjoy the most?": ["Challenges", "Learning Opportunities"]}'),
(uuid_generate_v4(), 
 (SELECT sys_id FROM survey WHERE title = 'Game Feedback Survey'), 
 (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'),
 '{"Which game features do you find most engaging?": ["Achievements", "Challenges"], "Do you have any suggestions for improving our platform?": "Add more team-based competitions"}');

-- Insert some KPI instance rollup data
INSERT INTO kpi_instance_rollup (sys_id, competitor, kpi, value, year) VALUES
(uuid_generate_v4(), 
 (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe')),
 (SELECT sys_id FROM key_performance_indicator WHERE name = 'Total Sales'),
 250000, 2024),
(uuid_generate_v4(), 
 (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith')),
 (SELECT sys_id FROM key_performance_indicator WHERE name = 'Code Quality'),
 92, 2024);

-- You can add more synthetic data here as needed for your testing purposes