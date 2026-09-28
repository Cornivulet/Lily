# Lily — API

API REST NestJS de Lily (auth, vaults, notes, liens, tags, dossiers, graphe), servie sous `/api` sur le port 3000.

```bash
npm run start:dev    # watch
npm run test         # tests unitaires
npm run test:e2e     # tests e2e (PostgreSQL requis)
npm run db:update    # aligne la base sur src/prisma/contract.prisma
```

- Installation, variables d'environnement, tests : [docs/DEVELOPMENT.md](../../docs/DEVELOPMENT.md)
- Modules, auth, modèle de données : [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- Routes et formats : [docs/SPEC.md §H](../../docs/SPEC.md#h-api-rest)
- Prisma Next : [prisma-next.md](prisma-next.md)
