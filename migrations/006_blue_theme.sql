-- 006_blue_theme.sql
--
-- The red accent was replaced with a blue one at the client's request.
-- Only changes the colour if it is still the red that migration 005 set, so
-- a company that has since picked its own colour keeps it.

UPDATE settings SET value = '#1877D9' WHERE key = 'brand_color' AND value = '#C9372C';
