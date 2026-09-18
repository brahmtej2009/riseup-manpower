-- 011_logo_row_sizing.sql
--
-- The row of client logos was set to 40 pixels tall, which reads as a footnote
-- rather than a band across the page. Roughly two centimetres, about 72
-- pixels, sits far better: clearly visible without dominating the section.
--
-- Only changes the height if it is still the one we shipped, so a company that
-- has already picked its own size keeps it.

UPDATE settings SET value = '72' WHERE key = 'logos_height' AND value = '40';

UPDATE settings SET hint =
  'Every logo is scaled to this height and keeps its own width, so a wide wordmark and a square badge sit together evenly. Around 72 is about two centimetres on screen. Between 24 and 140.'
 WHERE key = 'logos_height';

UPDATE settings SET hint =
  'Sits above the moving row. Something like "Companies we have worked with", "Our clients and partners" or "Organisations we supply". Left blank, the row is shown without a heading.'
 WHERE key = 'logos_heading';
