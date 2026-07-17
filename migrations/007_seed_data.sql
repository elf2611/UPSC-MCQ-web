INSERT INTO subjects (name, slug, icon, color) VALUES
('Polity', 'polity', '⚖️', '#6366f1'),
('History', 'history', '📜', '#f59e0b'),
('Geography', 'geography', '🌍', '#10b981'),
('Economy', 'economy', '📈', '#3b82f6'),
('Environment', 'environment', '🌿', '#22c55e'),
('Science & Tech', 'science-tech', '🔬', '#8b5cf6'),
('Current Affairs', 'current-affairs', '📰', '#ef4444')
ON CONFLICT (slug) DO NOTHING;
