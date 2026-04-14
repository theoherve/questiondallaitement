-- Seed data for development (Wix migration data)
--
-- Auth is handled by NextAuth (ADR-008), not Supabase Auth.
-- Profiles are inserted directly — no auth.users dependency.
-- Consultant UUID used throughout: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
--
DO $$
DECLARE cid UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
BEGIN -- 1. Profile + Consultant
INSERT INTO profiles (id, role, email, first_name, last_name)
VALUES (
    cid,
    'consultant',
    'carole@questiondallaitement.fr',
    'Carole',
    'Hervé'
  ) ON CONFLICT (id) DO
UPDATE
SET role = EXCLUDED.role,
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = now();
INSERT INTO consultants (
    id,
    slug,
    bio,
    specialties,
    is_active,
    onboarding_completed
  )
VALUES (
    cid,
    'carole-herve',
    'Consultante en lactation certifiée IBCLC depuis 2011, j''aide plus de 1000 mères par an. Allaiter, ce n''est pas juste nourrir : c''est un projet intime, parfois semé de doutes, souvent transformateur. Mon engagement : vous offrir un accompagnement expert, humain et accessible.',
    ARRAY ['lactation', 'allaitement', 'IBCLC', 'Biological Nurturing'],
    true,
    true
  ) ON CONFLICT (id) DO
UPDATE
SET slug = EXCLUDED.slug,
  bio = EXCLUDED.bio,
  specialties = EXCLUDED.specialties,
  is_active = EXCLUDED.is_active,
  onboarding_completed = EXCLUDED.onboarding_completed,
  updated_at = now();
END $$;
-- 2. Consultation types (7 types, 60 min, price 0 = to be set later)
INSERT INTO consultation_types (
    consultant_id,
    title,
    description,
    duration_minutes,
    price_cents,
    currency,
    is_online,
    is_active
  )
SELECT c.id,
  t.title,
  t.description,
  60,
  0,
  'eur',
  true,
  true
FROM consultants c
  CROSS JOIN (
    VALUES (
        'Consultation prénatale',
        'Consultation pour préparer l''allaitement avant la naissance.'
      ),
      (
        'Consultation d''allaitement',
        'Accompagnement personnalisé pour votre allaitement.'
      ),
      (
        'Reprise du travail',
        'Concilier allaitement et reprise du travail.'
      ),
      (
        'Diversification alimentaire',
        'Diversification du bébé allaité.'
      ),
      (
        'Sommeil du tout-petit',
        'Sommeil du nourrisson et du jeune enfant.'
      ),
      ('Sevrage', 'Sevrage en douceur.'),
      (
        'Troubles alimentaires',
        'Troubles alimentaires pédiatriques et aversion sensorielle.'
      )
  ) AS t(title, description)
WHERE c.slug = 'carole-herve'
  AND NOT EXISTS (
    SELECT 1
    FROM consultation_types ct
    WHERE ct.consultant_id = c.id
      AND ct.title = t.title
  );
-- 3. Formations (9: 1 pack + 8 modules) — fixed UUIDs for pack sections reference
INSERT INTO formations (
    id,
    consultant_id,
    title,
    slug,
    short_description,
    price_cents,
    currency,
    status,
    published_at
  )
SELECT f.id::uuid,
  c.id,
  f.title,
  f.slug,
  f.short_description,
  f.price_cents,
  'eur',
  'published',
  now()
FROM consultants c
  CROSS JOIN (
    VALUES (
        'f0000001-0001-4000-8000-000000000001',
        'Pack - L''essentiel de l''allaitement',
        'pack-essentiel-allaitement',
        '7 modules, + de 140 vidéos et + de 40 h de contenu pour installer votre allaitement et le poursuivre comme vous l''entendez.',
        51900
      ),
      (
        'f0000002-0002-4000-8000-000000000002',
        'Je me prépare à allaiter',
        'je-me-prepare-a-allaiter',
        'Tout ce qu''il faut savoir pour démarrer votre allaitement sans stress.',
        6700
      ),
      (
        'f0000003-0003-4000-8000-000000000003',
        'Mon allaitement des premiers jours',
        'mon-allaitement-des-premiers-jours',
        'Les bonnes clés et les bonnes bases pour ne plus être fragilisée par des diktats obsolètes.',
        6700
      ),
      (
        'f0000004-0004-4000-8000-000000000004',
        'Mon allaitement au fil des mois',
        'mon-allaitement-au-fil-des-mois',
        'Comprenez les besoins fondamentaux de votre bébé en préservant les vôtres.',
        6700
      ),
      (
        'f0000005-0005-4000-8000-000000000005',
        'Les urgences de l''allaitement',
        'les-urgences-allaitement',
        'Crevasses, mastite, canal bouché : le B-A BA pour éviter des complications.',
        2700
      ),
      (
        'f0000006-0006-4000-8000-000000000006',
        'Je reprends une activité professionnelle',
        'je-reprends-une-activite-professionnelle',
        'Concilier allaitement et travail avec une lactation solide.',
        6700
      ),
      (
        'f0000007-0007-4000-8000-000000000007',
        'Je souhaite sevrer mon bébé',
        'je-souhaite-sevrer-mon-bebe',
        'Un plan détaillé pour sevrer en douceur.',
        6700
      ),
      (
        'f0000008-0008-4000-8000-000000000008',
        'La diversification de mon bébé allaité',
        'la-diversification-de-mon-bebe-allaite',
        'Les bonnes pratiques pour diversifier tout en poursuivant l''allaitement.',
        6700
      ),
      (
        'f0000009-0009-4000-8000-000000000009',
        'Mon bébé ne fait pas ses nuits',
        'mon-bebe-ne-fait-pas-ses-nuits',
        'Comprendre et améliorer le sommeil de votre enfant, de la naissance à 5 ans.',
        9700
      )
  ) AS f(id, title, slug, short_description, price_cents)
WHERE c.slug = 'carole-herve' ON CONFLICT (id) DO
UPDATE
SET title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  short_description = EXCLUDED.short_description,
  price_cents = EXCLUDED.price_cents,
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at,
  updated_at = now();
-- 4. Formation sections for the Pack (7 modules)
INSERT INTO formation_sections (formation_id, title, position)
SELECT 'f0000001-0001-4000-8000-000000000001'::uuid,
  s.title,
  s.pos
FROM (
    VALUES (1, 'Je me prépare à allaiter'),
      (2, 'Mon allaitement des premiers jours'),
      (3, 'Mon allaitement au fil des mois'),
      (4, 'Les urgences de l''allaitement'),
      (5, 'Je reprends une activité professionnelle'),
      (6, 'Je souhaite sevrer mon bébé'),
      (7, 'La diversification de mon bébé allaité')
  ) AS s(pos, title)
WHERE NOT EXISTS (
    SELECT 1
    FROM formation_sections fs
    WHERE fs.formation_id = 'f0000001-0001-4000-8000-000000000001'::uuid
      AND fs.title = s.title
  );
-- 5. Events (formations pro — scraped from Wix)
\i ./supabase/seed_formations_pro.sql
-- 6. Platform settings (about, books, media_conferences)
INSERT INTO platform_settings (key, value, updated_at)
VALUES (
    'about_page',
    '{
      "title": "À propos",
      "consultant_name": "Carole Hervé",
      "tagline": "Consultante en lactation IBCLC, auteure, formatrice, conférencière",
      "bio": "Je suis consultante en lactation certifiée IBCLC depuis 2011 et j''aide plus de 1000 mères par an. Allaiter, ce n''est pas juste nourrir : c''est un projet intime, parfois semé de doutes, souvent transformateur. Ensemble, nous levons les obstacles, pour que vos résultats vous procurent un sentiment de fierté indescriptible.",
      "engagement": "Mon engagement : vous offrir un accompagnement expert, humain et accessible, et que chaque mère qui le souhaite puisse s''épanouir dans son allaitement."
    }'::jsonb,
    now()
  ),
  (
    'books_page',
    '{
      "title": "Les livres que vous cherchez sur l''allaitement",
      "intro": "Dans mes livres, formations, ateliers et conférences, je partage une vision positive et bienveillante de l''allaitement maternel.",
      "books": [
        { "title": "L''allaitement pour les nuls", "edition": "éditions First", "price": "24,95€", "pages": 446 },
        { "title": "Mon allaitement sur mesure", "edition": "éditions Albin Michel", "price": "18,90€" },
        { "title": "Choisir d''allaiter", "edition": "éditions First", "price": "12,50€" }
      ]
    }'::jsonb,
    now()
  ),
  (
    'media_conferences_page',
    '{
      "title": "Médias & Conférences",
      "subtitle": "Vous m''avez peut-être vue ou entendue ici",
      "conference_topics": ["Allaitement", "Décortiquer les clichés et idées reçues", "Quand le sevrage est difficile", "Relancer un allaitement fragile", "Difficultés alimentaires", "Aversion alimentaire d''origine sensorielle", "RGO et coliques chez le nourrisson"],
      "media_mentions": ["La maison des maternelles", "Beur FM", "Parents magazine"]
    }'::jsonb,
    now()
  ) ON CONFLICT (key) DO
UPDATE
SET value = EXCLUDED.value,
  updated_at = EXCLUDED.updated_at;
-- 7. Default email templates (kept from original seed)
INSERT INTO email_templates (name, subject, body_html, type, variables)
SELECT v.name,
  v.subject,
  v.body_html,
  v.type,
  v.variables::jsonb
FROM (
    VALUES (
        'booking_confirmation',
        'Confirmation de votre réservation — {{date}}',
        '<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a"><h1 style="font-size:22px;margin-bottom:8px;color:#A0283E">Réservation confirmée ✓</h1><p style="margin-bottom:24px">Bonjour {{client_name}},</p><p>Votre consultation avec <strong>{{consultant_name}}</strong> est confirmée :</p><table style="margin:20px 0;border-left:3px solid #A0283E;padding-left:16px"><tr><td style="padding:4px 0"><strong>📅 Date :</strong> {{date}}</td></tr><tr><td style="padding:4px 0"><strong>⏰ Heure :</strong> {{time}}</td></tr></table>{{zoom_block}}<p style="margin-top:32px;color:#666;font-size:14px">À bientôt,<br>L''équipe Question d''Allaitement</p></div>',
        'transactional',
        '["client_name", "consultant_name", "date", "time", "zoom_block"]'
      ),
      (
        'booking_reminder',
        'Rappel : votre consultation demain',
        '<h1>Rappel</h1><p>Bonjour {{client_name}},</p><p>Votre consultation avec {{consultant_name}} a lieu demain à {{time}}.</p>',
        'transactional',
        '["client_name", "consultant_name", "time"]'
      ),
      (
        'booking_cancelled',
        'Annulation de votre réservation',
        '<h1>Réservation annulée</h1><p>Bonjour {{client_name}},</p><p>Votre consultation du {{date}} a été annulée. {{refund_info}}</p>',
        'transactional',
        '["client_name", "date", "refund_info"]'
      ),
      (
        'formation_access',
        'Accès à votre formation',
        '<h1>Formation disponible</h1><p>Bonjour {{client_name}},</p><p>Vous avez maintenant accès à la formation "{{formation_title}}". Cliquez ci-dessous pour commencer.</p>',
        'transactional',
        '["client_name", "formation_title"]'
      ),
      (
        'welcome',
        'Bienvenue sur Question d''Allaitement',
        '<h1>Bienvenue !</h1><p>Bonjour {{client_name}},</p><p>Nous sommes ravis de vous accueillir sur Question d''Allaitement.</p>',
        'transactional',
        '["client_name"]'
      ),
      (
        'password_reset',
        'Réinitialisation de votre mot de passe',
        '<h1>Réinitialisation de mot de passe</h1><p>Bonjour {{client_name}},</p><p>Vous avez demandé la réinitialisation de votre mot de passe.</p><p><a href="{{reset_url}}" style="display:inline-block;padding:12px 24px;background-color:#A0283E;color:#fff;text-decoration:none;border-radius:6px;">Réinitialiser mon mot de passe</a></p><p>Ce lien est valide pendant 24 heures.</p><p>Si vous n''avez pas fait cette demande, ignorez cet email.</p>',
        'transactional',
        '["client_name", "reset_url"]'
      )
  ) AS v(name, subject, body_html, type, variables)
WHERE NOT EXISTS (
    SELECT 1
    FROM email_templates e
    WHERE e.name = v.name
  );
-- 8. Detailed formation content (sections + blocks) generated from Wix export
\i ./supabase/seed_formations_content.sql
-- 9. Blog posts (generated from wix-blog.json via scripts/generate-blog-seed.mjs)
\i ./supabase/seed_blog.sql