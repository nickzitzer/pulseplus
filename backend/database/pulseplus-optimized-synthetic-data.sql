-- Reset sequence if needed
-- SELECT setval(pg_get_serial_sequence('table_name', 'id'), 1, false);

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insert departments
INSERT INTO department (sys_id, name, description) VALUES
(uuid_generate_v4(), 'Sales', 'Sales and marketing department'),
(uuid_generate_v4(), 'Engineering', 'Software development and IT operations'),
(uuid_generate_v4(), 'Human Resources', 'Employee management and recruitment'),
(uuid_generate_v4(), 'Finance', 'Financial planning and accounting'),
(uuid_generate_v4(), 'Marketing', 'Brand and marketing strategies');

-- Insert users with strong passwords
INSERT INTO sys_user (sys_id, user_name, first_name, last_name, email, role, password_hash, department_id, avatar_url) VALUES
(uuid_generate_v4(), 'john.doe', 'John', 'Doe', 'john.doe@example.com', 'USER', crypt('P@8xK2#mL9qF5$vN', gen_salt('bf', 12)), (SELECT sys_id FROM department WHERE name = 'Sales'), '/avatars/john.jpg'),
(uuid_generate_v4(), 'jane.smith', 'Jane', 'Smith', 'jane.smith@example.com', 'MANAGER', crypt('R@7zJ3$nH6wT9#bM', gen_salt('bf', 12)), (SELECT sys_id FROM department WHERE name = 'Engineering'), '/avatars/jane.jpg'),
(uuid_generate_v4(), 'bob.johnson', 'Bob', 'Johnson', 'bob.johnson@example.com', 'USER', crypt('G@5yC8#fD2sX7$pQ', gen_salt('bf', 12)), (SELECT sys_id FROM department WHERE name = 'Human Resources'), '/avatars/bob.jpg'),
(uuid_generate_v4(), 'alice.williams', 'Alice', 'Williams', 'alice.williams@example.com', 'ADMIN', crypt('W@3tB6$kM4nL9#hF', gen_salt('bf', 12)), (SELECT sys_id FROM department WHERE name = 'Finance'), '/avatars/alice.jpg'),
(uuid_generate_v4(), 'charlie.brown', 'Charlie', 'Brown', 'charlie.brown@example.com', 'GAMEMASTER', crypt('Q@9pL4#nB7vM2$kS', gen_salt('bf', 12)), (SELECT sys_id FROM department WHERE name = 'Marketing'), '/avatars/charlie.jpg');

-- Insert games
INSERT INTO game (sys_id, name, description, gamemaster, primary_color, secondary_color, currency_name, currency_conversion, is_active) VALUES
(uuid_generate_v4(), 'Sales Challenge 2024', 'Boost your sales performance!', (SELECT sys_id FROM sys_user WHERE user_name = 'charlie.brown'), '#1F8476', '#6ABECF', 'Sales Points', 0.01, true),
(uuid_generate_v4(), 'Code Masters', 'Showcase your coding skills!', (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), '#4B0082', '#6ABECF', 'Code Coins', 0.02, true),
(uuid_generate_v4(), 'Innovation Quest', 'Drive innovation and creativity!', (SELECT sys_id FROM sys_user WHERE user_name = 'charlie.brown'), '#FF4500', '#FFD700', 'Innovation Tokens', 0.015, true);

-- Insert seasons
INSERT INTO season (sys_id, game_id, name, description, start_date, end_date, theme, battle_pass_enabled, current_season) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'Spring Season 2024', 'Spring sales competition', '2024-03-01', '2024-05-31', 'Spring Growth', true, true),
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Code Masters'), 'Q2 Code Challenge', 'Technical excellence quarter', '2024-04-01', '2024-06-30', 'Technical Innovation', true, true),
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Innovation Quest'), 'Innovation Sprint', 'Rapid innovation period', '2024-05-01', '2024-07-31', 'Future Forward', true, true);

-- Insert season tiers
INSERT INTO season_tier (sys_id, season_id, tier_level, xp_required, free_rewards, premium_rewards) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM season WHERE name = 'Spring Season 2024'), 1, 0, '{"rewards": ["Basic Badge", "100 Points"]}', '{"rewards": ["Premium Badge", "500 Points", "Special Avatar"]}'),
(uuid_generate_v4(), (SELECT sys_id FROM season WHERE name = 'Spring Season 2024'), 2, 1000, '{"rewards": ["Silver Badge", "200 Points"]}', '{"rewards": ["Premium Silver Badge", "1000 Points", "Special Effect"]}'),
(uuid_generate_v4(), (SELECT sys_id FROM season WHERE name = 'Q2 Code Challenge'), 1, 0, '{"rewards": ["Code Novice Badge", "50 Coins"]}', '{"rewards": ["Code Expert Badge", "300 Coins", "Special Theme"]}');

-- Insert virtual currencies
INSERT INTO virtual_currency (sys_id, game_id, currency_name, currency_symbol, exchange_rate, is_premium) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'Sales Points', 'SP', 0.01, false),
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'Premium Points', 'PP', 0.05, true),
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Code Masters'), 'Code Coins', 'CC', 0.02, false);

-- Insert reward shops
INSERT INTO reward_shop (sys_id, game_id, name, description, currency_id, refresh_interval) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'Sales Rewards', 'Exchange your points for rewards', (SELECT sys_id FROM virtual_currency WHERE currency_name = 'Sales Points'), 'WEEKLY'),
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Code Masters'), 'Code Store', 'Get exclusive developer perks', (SELECT sys_id FROM virtual_currency WHERE currency_name = 'Code Coins'), 'MONTHLY');

-- Insert shop items
INSERT INTO shop_item (sys_id, shop_id, name, description, price, item_type, rarity, stock_quantity) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM reward_shop WHERE name = 'Sales Rewards'), 'Premium Avatar', 'Exclusive avatar frame', 1000.0000, 'COSMETIC', 'RARE', 100),
(uuid_generate_v4(), (SELECT sys_id FROM reward_shop WHERE name = 'Code Store'), 'Code Theme', 'Custom IDE theme', 500.0000, 'COSMETIC', 'UNCOMMON', 200);

-- Insert competitors
INSERT INTO competitor (sys_id, user_id, game_id, total_points, current_balance, level, current_xp) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 5000, 1000, 3, 2500),
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), (SELECT sys_id FROM game WHERE name = 'Code Masters'), 4500, 900, 2, 1800),
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'bob.johnson'), (SELECT sys_id FROM game WHERE name = 'Innovation Quest'), 3000, 600, 1, 950);

-- Insert season pass progress
INSERT INTO season_pass_progress (competitor_id, season_id, current_tier, current_xp, is_premium) VALUES
((SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe') AND game_id = (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024')), 
 (SELECT sys_id FROM season WHERE name = 'Spring Season 2024'), 2, 1500, true),
((SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith')), 
 (SELECT sys_id FROM season WHERE name = 'Q2 Code Challenge'), 1, 800, false);

-- Insert currency balances
INSERT INTO currency_balance (sys_id, competitor_id, currency_id, balance) VALUES
(uuid_generate_v4(), 
 (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe')),
 (SELECT sys_id FROM virtual_currency WHERE currency_name = 'Sales Points'),
 5000.0000),
(uuid_generate_v4(), 
 (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith')),
 (SELECT sys_id FROM virtual_currency WHERE currency_name = 'Code Coins'),
 3000);

-- Insert quests
INSERT INTO quest (sys_id, game_id, name, description, difficulty_level, required_level, reward_type, reward_amount) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'First Sale', 'Complete your first sale', 1, 1, 'POINTS', 100),
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Code Masters'), 'Bug Hunter', 'Find and fix 5 bugs', 2, 1, 'XP', 200);

-- Insert quest objectives
INSERT INTO quest_objective (sys_id, quest_id, objective_type, target_amount, description) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM quest WHERE name = 'First Sale'), 'SALES', 1, 'Make one successful sale'),
(uuid_generate_v4(), (SELECT sys_id FROM quest WHERE name = 'Bug Hunter'), 'BUGS_FIXED', 5, 'Fix 5 critical bugs');

-- Insert power-ups
INSERT INTO powerup (sys_id, game_id, name, description, effect_type, duration_minutes, multiplier) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'Double Points', 'Double all points earned', 'POINTS_MULTIPLIER', 60, 2.0),
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Code Masters'), 'XP Boost', 'Increase XP gain by 50%', 'XP_MULTIPLIER', 120, 1.5);

-- Insert achievements
INSERT INTO achievement (sys_id, game_id, name, description, trigger_condition, point_value, xp_value) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'Sales Rookie', 'Complete your first sale', '{"condition_type": "sales", "threshold": 1}', 100, 50),
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Code Masters'), 'Code Warrior', 'Complete 10 challenges', '{"challenges": 10}', 500, 250);

-- Insert badges
INSERT INTO badge (sys_id, game_id, name, description, image_url, award_criteria, xp_value, rarity) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'Top Seller', 'Achieved outstanding sales', '/badges/top-seller.png', '{"sales_amount": 10000}', 1000, 'EPIC'),
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Code Masters'), 'Master Coder', 'Demonstrated exceptional coding skills', '/badges/master-coder.png', '{"code_quality": 95}', 2000, 'LEGENDARY');

-- Insert teams
INSERT INTO team (sys_id, game_id, name, description, leader_id, max_members) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'Top Sellers', 'Elite sales team', (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), 5),
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Code Masters'), 'Code Ninjas', 'Expert developers', (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), 5);

-- Insert leaderboards
INSERT INTO leaderboard (sys_id, game_id, name, type, reset_frequency) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), 'Sales Rankings', 'INDIVIDUAL', 'MONTHLY'),
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Code Masters'), 'Coding Excellence', 'TEAM', 'WEEKLY');

-- Insert daily challenges
INSERT INTO daily_challenge (sys_id, game_id, challenge_date, name, description, reward_type, reward_amount, difficulty) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Sales Challenge 2024'), CURRENT_DATE, 'Quick Sales', 'Make 3 sales today', 'POINTS', 300, 'MEDIUM'),
(uuid_generate_v4(), (SELECT sys_id FROM game WHERE name = 'Code Masters'), CURRENT_DATE, 'Code Review', 'Review 5 pull requests', 'XP', 150, 'EASY');

-- Insert notifications
INSERT INTO notification (sys_id, user_id, type, title, content) VALUES
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), 'ACHIEVEMENT', 'Achievement Unlocked!', 'You earned the Sales Rookie badge!'),
(uuid_generate_v4(), (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), 'CHALLENGE', 'New Challenge Available', 'Daily coding challenge is ready!');

-- Insert audit logs
INSERT INTO audit_log (sys_id, event_type, user_id, target_table, record_id, new_values) VALUES
(uuid_generate_v4(), 'CREATE', (SELECT sys_id FROM sys_user WHERE user_name = 'john.doe'), 'achievement', 
 (SELECT sys_id FROM achievement WHERE name = 'Sales Rookie'), 
 '{"name": "Sales Rookie", "point_value": 100}'),
(uuid_generate_v4(), 'UPDATE', (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith'), 'competitor',
 (SELECT sys_id FROM competitor WHERE user_id = (SELECT sys_id FROM sys_user WHERE user_name = 'jane.smith')),
 '{"level": 2, "total_points": 4500}');