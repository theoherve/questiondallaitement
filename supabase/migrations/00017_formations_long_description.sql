-- Migration 00017: Add long_description_html to formations (EPIC-03, ADR-010)
-- WYSIWYG HTML content for the detailed formation description.

ALTER TABLE formations ADD COLUMN IF NOT EXISTS long_description_html TEXT;
