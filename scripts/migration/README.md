# Migration Wix -> Question d'Allaitement

## Plan de migration

### Phase 1 : Audit (1 semaine)
- [ ] Inventorier toutes les pages Wix
- [ ] Exporter la liste des contacts/clients
- [ ] Lister les medias (images, documents)
- [ ] Documenter les URLs actuelles pour les redirections

### Phase 2 : Export (1 semaine)
- [ ] Exporter les contacts via Wix API ou CSV
- [ ] Telecharger tous les medias
- [ ] Exporter le contenu des pages

### Phase 3 : Transformation (1-2 semaines)
- [ ] Executer `transform-contacts.ts` pour convertir les contacts en profils Supabase
- [ ] Executer `transform-media.ts` pour uploader les medias vers Supabase Storage
- [ ] Mapper les anciennes URLs vers les nouvelles routes

### Phase 4 : Import (1 semaine)
- [ ] Executer les scripts d'import dans Supabase
- [ ] Verifier l'integrite des donnees

### Phase 5 : Redirections (2 jours)
- [ ] Configurer les redirections dans next.config.ts
- [ ] Tester chaque ancienne URL

### Phase 6 : Tests (2 semaines)
- [ ] Executer les deux sites en parallele
- [ ] Tests fonctionnels complets
- [ ] Tests de performance

### Phase 7 : Migration DNS (1 jour)
- [ ] Pointer le domaine vers Vercel
- [ ] Verifier le certificat SSL

### Phase 8 : Post-migration (1 semaine)
- [ ] Monitorer les erreurs
- [ ] Corriger les problemes identifies
- [ ] Desactiver Wix

## Scripts disponibles

- `transform-contacts.ts` - Transforme les contacts Wix CSV en format Supabase
- `transform-media.ts` - Upload les medias vers Supabase Storage
- `import-data.ts` - Importe les donnees transformees dans Supabase
- `verify-redirects.ts` - Verifie que toutes les redirections fonctionnent
