-- Fix blog post slugs that contain accented characters
-- This uses translate() to replace common French accented characters

UPDATE blog_posts
SET slug = regexp_replace(
  regexp_replace(
    lower(
      translate(
        slug,
        'àâäáãåæçèéêëìîïíòôöóõøùûüúýÿñÀÂÄÁÃÅÆÇÈÉÊËÌÎÏÍÒÔÖÓÕØÙÛÜÚÝŸÑ',
        'aaaaaaeceeeeiiiioooooouuuuyynAAAAAEACEEEEIIIIOOOOOOUUUUYYN'
      )
    ),
    '[^a-z0-9]+', '-', 'g'  -- replace non-alphanumeric with hyphens
  ),
  '(^-|-$)', '', 'g'  -- trim leading/trailing hyphens
)
WHERE slug ~ '[^a-z0-9\-]';

-- Also fix blog category slugs
UPDATE blog_categories
SET slug = regexp_replace(
  regexp_replace(
    lower(
      translate(
        slug,
        'àâäáãåæçèéêëìîïíòôöóõøùûüúýÿñÀÂÄÁÃÅÆÇÈÉÊËÌÎÏÍÒÔÖÓÕØÙÛÜÚÝŸÑ',
        'aaaaaaeceeeeiiiioooooouuuuyynAAAAAEACEEEEIIIIOOOOOOUUUUYYN'
      )
    ),
    '[^a-z0-9]+', '-', 'g'
  ),
  '(^-|-$)', '', 'g'
)
WHERE slug ~ '[^a-z0-9\-]';
