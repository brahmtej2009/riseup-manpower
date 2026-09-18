-- 013_logo_colors_default.sql
--
-- The client logo row desaturated every logo to grey until it was pointed at.
-- That reads as broken rather than restrained when the logos are transparent
-- PNGs meant to be seen in their own colours, so normal colour is now the
-- default. Grey-until-hovered is still available as a setting for anyone who
-- wants that treatment.
--
-- Only flips the value if it is still the one we shipped, so a company that
-- has already chosen for itself keeps its choice.

UPDATE settings SET value = '0' WHERE key = 'logos_grayscale' AND value = '1';

UPDATE settings SET hint =
  'Off shows every logo in its own colours, which suits most transparent logos. On, they turn grey until pointed at.'
 WHERE key = 'logos_grayscale';
