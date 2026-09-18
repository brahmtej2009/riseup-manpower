-- 012_logo_row_optional.sql
--
-- The row of client logos is off until the company decides to use it. It is
-- an add-on, not part of the standard page, so it should be put there on
-- purpose rather than needing to be switched off.
--
-- It stays hidden anyway while no logos have been added, so this only changes
-- what happens once the first one is.

UPDATE settings SET value = '0' WHERE key = 'logos_show_home' AND value = '1';

UPDATE settings SET hint =
  'Off by default. Turn this on once you have added client logos, and the moving row appears on the home page. Any number of logos is supported.'
 WHERE key = 'logos_show_home';

UPDATE settings SET hint =
  'Seconds for one logo to travel the full width. The row keeps this pace however many logos there are, so adding more makes the row longer rather than faster.'
 WHERE key = 'logos_speed';
