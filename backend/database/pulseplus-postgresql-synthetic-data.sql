CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Insert departments
INSERT INTO department (sys_id, name, description) VALUES
(uuid_generate_v4(), 'Sales', 'Sales and marketing department'),
(uuid_generate_v4(), 'Engineering', 'Software development and IT operations'),
(uuid_generate_v4(), 'Human Resources', 'Employee management and recruitment'),
(uuid_generate_v4(), 'Finance', 'Financial planning and accounting');

-- Update existing users with stronger passwords and add new admin users
INSERT INTO sys_user (sys_id, user_name, first_name, last_name, email, active, department_id, password_hash, role) VALUES
(uuid_generate_v4(), 'john.doe', 'John', 'Doe', 'john.doe@example.com', true, (SELECT sys_id FROM department WHERE name = 'Sales'), crypt('P@8xK2#mL9qF5$vN', gen_salt('bf', 12)), 'USER'),
(uuid_generate_v4(), 'jane.smith', 'Jane', 'Smith', 'jane.smith@example.com', true, (SELECT sys_id FROM department WHERE name = 'Engineering'), crypt('R@7zJ3$nH6wT9#bM', gen_salt('bf', 12)), 'MANAGER'),
(uuid_generate_v4(), 'bob.johnson', 'Bob', 'Johnson', 'bob.johnson@example.com', true, (SELECT sys_id FROM department WHERE name = 'Human Resources'), crypt('G@5yC8#fD2sX7$pQ', gen_salt('bf', 12)), 'USER'),
(uuid_generate_v4(), 'alice.williams', 'Alice', 'Williams', 'alice.williams@example.com', true, (SELECT sys_id FROM department WHERE name = 'Finance'), crypt('W@3tB6$kM4nL9#hF', gen_salt('bf', 12)), 'ADMIN'),
(uuid_generate_v4(), 'eric.singer', 'Eric', 'Singer', 'eric.singer@example.com', true, (SELECT sys_id FROM department WHERE name = 'Engineering'), crypt('Z@9qN7#xV2mS5$jH', gen_salt('bf', 12)), 'ADMIN'),
(uuid_generate_v4(), 'dan.romano', 'Dan', 'Romano', 'dan.romano@example.com', true, (SELECT sys_id FROM department WHERE name = 'Sales'), crypt('Y@6wF4$cT8pK3#bL', gen_salt('bf', 12)), 'ADMIN'),
(uuid_generate_v4(), 'nick.zitzer', 'Nick', 'Zitzer', 'nick.zitzer@example.com', true, (SELECT sys_id FROM department WHERE name = 'Finance'), crypt('U@2mH9#rJ7sN5$xQ', gen_salt('bf', 12)), 'ADMIN');

-- Insert point systems
INSERT INTO point_system (sys_id, label, dollar_conversion, image_url) VALUES
(uuid_generate_v4(), 'Standard Points', 0.01, '/uploads/point-system.png'),
(uuid_generate_v4(), 'Premium Points', 0.02, '/uploads/point-system.png');

-- Insert games
INSERT INTO game (sys_id, number, name, description, gamemaster, point_system, active, image_url, background_url) VALUES
(uuid_generate_v4(), 'GAME001', 'Sales Challenge 2024', 'Boost your sales performance and climb the leaderboard!', (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), (SELECT sys_id FROM point_system WHERE label = 'Standard Points'), true, '/uploads/game.png', '/uploads/game-background.png'),
(uuid_generate_v4(), 'GAME002', 'Code Masters', 'Showcase your coding skills and solve challenging problems!', (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), (SELECT sys_id FROM point_system WHERE label = 'Premium Points'), true, '/uploads/game.png', '/uploads/game-background.png');

-- Insert competitors
INSERT INTO competitor (sys_id, user_id, total_earnings, account_balance, performance_group, about_me, avatar_url) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), 5000, 1000, 'High Performers', 'Enthusiastic sales professional with a passion for exceeding targets.', '/uploads/avatar.png'),
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), 4500, 900, 'High Performers', 'Innovative software engineer always looking for the next big challenge.', '/uploads/avatar.png'),
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'bob.johnson'), 3000, 600, 'Mid Performers', 'Dedicated HR specialist focused on creating a positive work environment.', '/uploads/avatar.png'),
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'alice.williams'), 3500, 700, 'Mid Performers', 'Detail-oriented finance expert with a knack for spotting trends.', '/uploads/avatar.png');

-- Insert competitions
INSERT INTO competition (sys_id, number, name, description, game, start_date, end_date, competition_type, player_type, deadline, image_url) VALUES
(uuid_generate_v4(), 'COMP001', 'Q2 Sales Sprint', 'Race to close the most deals in Q2', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), '2024-04-01', '2024-06-30', 'Individual', 'Solo', '2024-06-30 23:59:59', '/uploads/competition.png'),
(uuid_generate_v4(), 'COMP002', 'Hackathon 2024', 'Build an innovative app in 48 hours', (SELECT sys_id FROM game WHERE name = 'Code Masters'), '2024-07-15', '2024-07-17', 'Team', 'Group', '2024-07-17 23:59:59', '/uploads/competition.png');

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
INSERT INTO badge (sys_id, name, description, color, game, image_url) VALUES
(uuid_generate_v4(), 'Sales Superstar', 'Awarded for exceptional sales performance', '#FFD700', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), '/uploads/badge.png'),
(uuid_generate_v4(), 'Code Ninja', 'Awarded for solving complex coding challenges', '#4B0082', (SELECT sys_id FROM game WHERE name = 'Code Masters'), '/uploads/badge.png');

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
INSERT INTO level (sys_id, number, name, description, game, type, order_num, color, entry_points, image_url) VALUES
(uuid_generate_v4(), 'LVL001', 'Bronze League', 'Entry level for all competitors', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'league', 1, '#CD7F32', 0, '/uploads/level.png'),
(uuid_generate_v4(), 'LVL002', 'Silver League', 'Intermediate level for consistent performers', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'league', 2, '#C0C0C0', 1000, '/uploads/level.png'),
(uuid_generate_v4(), 'LVL003', 'Gold League', 'Advanced level for top performers', (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'league', 3, '#FFD700', 5000, '/uploads/level.png');

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
INSERT INTO team (sys_id, name, members, image_url) VALUES
(uuid_generate_v4(), 'Alpha Sales Team', ARRAY[(SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), (SELECT sys_id FROM sys_user WHERE user_name = 'alice.williams')], '/uploads/team.png'),
(uuid_generate_v4(), 'Beta Dev Team', ARRAY[(SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), (SELECT sys_id FROM sys_user WHERE user_name = 'bob.johnson')], '/uploads/team.png');

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

-- Insert script rules
INSERT INTO script_rule (table_name, rule_name, condition, insert_enabled, update_enabled, query_enabled, delete_enabled, script, active) VALUES
('level_instance', 'denormalizeOrder', '', true, true, false, false, 
'const { rows } = await client.query(
  ''UPDATE level_instance SET "order" = (SELECT order_num FROM level WHERE sys_id = $1) WHERE sys_id = $2 RETURNING *'',
  [current.level, current.sys_id]
);
return rows[0];', true),

('achievement_competitor', 'awardPoints', '', true, false, false, false, 
'const { rows: [achievement] } = await client.query(
  ''SELECT * FROM achievement WHERE sys_id = $1'',
  [current.achievement_id]
);
const { rows: [competitor] } = await client.query(
  ''SELECT * FROM competitor WHERE sys_id = $1'',
  [current.competitor_id]
);
if (achievement && competitor) {
  await client.query(
    ''UPDATE competitor SET total_earnings = total_earnings + $1 WHERE sys_id = $2'',
    [achievement.point_value, competitor.sys_id]
  );
}', true),

('achievement_competitor', 'addGoalIncrements', '', true, false, false, false, 
'await client.query(`
  UPDATE goal_instance
  SET value = value + 1
  WHERE competitor = $1
    AND goal IN (SELECT sys_id FROM goal WHERE achievement = $2)
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
`, [current.competitor_id, current.achievement_id]);', true),

('achievement_competitor', 'addLeaguePoints', '', true, false, false, false, 
'const { rows: [achievement] } = await client.query(
  ''SELECT * FROM achievement WHERE sys_id = $1'',
  [current.achievement_id]
);
if (achievement) {
  await client.query(`
    UPDATE level_instance_member
    SET points = points + $1
    WHERE competitor = $2
      AND level_instance IN (
        SELECT li.sys_id
        FROM level_instance li
        JOIN level l ON li.level = l.sys_id
        WHERE l.game = $3
          AND li.start_date <= CURRENT_DATE
          AND li.end_date >= CURRENT_DATE
      )
  `, [achievement.point_value, current.competitor_id, achievement.game]);
}', true),

('level_instance_member', 'denormalizeLevelOrder', '', true, true, false, false, 
'const { rows } = await client.query(`
  UPDATE level_instance_member
  SET level_order = (SELECT order_num FROM level WHERE sys_id = 
    (SELECT level FROM level_instance WHERE sys_id = $1))
  WHERE sys_id = $2
  RETURNING *
`, [current.level_instance, current.sys_id]);
return rows[0];', true),

('team_competition', 'preventDuplicateCompetitor', '', true, true, false, false, 
'const { rows } = await client.query(`
  SELECT tc.team_id
  FROM team_competition tc
  JOIN team t ON tc.team_id = t.sys_id
  WHERE tc.competition_id = $1
    AND $2 != tc.team_id
    AND t.members && (SELECT members FROM team WHERE sys_id = $2)
`, [current.competition_id, current.team_id]);
if (rows.length > 0) {
  throw new Error(`A member of this team is already part of another team (${rows[0].team_id}) in this competition`);
}', true),

('goal_instance', 'notifyNewGoalInstance', '', true, false, false, false, 
'const { rows: [goal] } = await client.query(
  ''SELECT * FROM goal WHERE sys_id = $1'',
  [current.goal]
);
if (goal) {
  await client.query(`
    INSERT INTO notifier (description, receiver, notification_type, type)
    VALUES ($1, $2, ''info'', ''new_goal'')
  `, [`Your goal of ${goal.name} has begun!`, current.competitor]);
}', true),

('badge_competitor', 'notifyNewBadgeEarned', '', true, false, false, false, 
'const { rows: [badge] } = await client.query(
  ''SELECT * FROM badge WHERE sys_id = $1'',
  [current.badges]
);
if (badge) {
  await client.query(`
    INSERT INTO notifier (description, receiver, notification_type, type)
    VALUES ($1, $2, ''info'', ''new_badge'')
  `, [`You have earned the following badge: ${badge.name}`, current.competitor]);
}', true);

-- You can add more synthetic data here as needed for your testing purposes