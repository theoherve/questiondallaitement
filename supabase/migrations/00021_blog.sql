-- Migration 00021: Blog system (ADR-011)
-- Creates blog_status enum, blog_categories and blog_posts tables
-- ─── 15-01: Enum blog_status ────────────────────────────────
CREATE TYPE blog_status AS ENUM (
    'draft',
    'scheduled',
    'published',
    'archived'
);
-- ─── 15-01: Table blog_categories ───────────────────────────
CREATE TABLE blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX idx_blog_categories_position ON blog_categories(position);
-- ─── 15-01: Table blog_posts ────────────────────────────────
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    body_html TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT,
    category_id UUID REFERENCES blog_categories(id) ON DELETE
    SET NULL,
        author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        consultant_id UUID REFERENCES consultants(id) ON DELETE
    SET NULL,
        status blog_status NOT NULL DEFAULT 'draft',
        meta_title TEXT,
        meta_description TEXT,
        og_image_url TEXT,
        tags TEXT [] DEFAULT '{}',
        scheduled_at TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_consultant ON blog_posts(consultant_id);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_scheduled ON blog_posts(status, scheduled_at)
WHERE status = 'scheduled';
-- Trigger pour updated_at
CREATE TRIGGER blog_posts_updated_at BEFORE
UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ─── 15-02: RLS policies for blog_categories ────────────────
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
-- Public: anyone can read categories
CREATE POLICY blog_categories_select_public ON blog_categories FOR
SELECT USING (true);
-- Admin only: insert/update/delete
CREATE POLICY blog_categories_insert_admin ON blog_categories FOR
INSERT WITH CHECK (is_admin());
CREATE POLICY blog_categories_update_admin ON blog_categories FOR
UPDATE USING (is_admin());
CREATE POLICY blog_categories_delete_admin ON blog_categories FOR DELETE USING (is_admin());
-- ─── 15-02: RLS policies for blog_posts ─────────────────────
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
-- Public: can read published posts (not deleted)
CREATE POLICY blog_posts_select_public ON blog_posts FOR
SELECT USING (
        status = 'published'
        AND deleted_at IS NULL
        AND published_at <= now()
    );
-- Admin: can read all posts (for the admin panel)
CREATE POLICY blog_posts_select_admin ON blog_posts FOR
SELECT USING (is_admin());
-- Admin only: insert/update/delete
CREATE POLICY blog_posts_insert_admin ON blog_posts FOR
INSERT WITH CHECK (is_admin());
CREATE POLICY blog_posts_update_admin ON blog_posts FOR
UPDATE USING (is_admin());
CREATE POLICY blog_posts_delete_admin ON blog_posts FOR DELETE USING (is_admin());