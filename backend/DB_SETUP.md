DB setup — Créer les tables et initialiser la base

1) Utiliser Prisma (recommandé)

- Assurez-vous d'avoir un fichier `.env` à la racine contenant `DATABASE_URL`.
- Installer dépendances et générer le client Prisma:

```bash
npm install
npx prisma generate
```

- Appliquer le schéma vers la base (sans migrations):

```bash
npx prisma db push
```

- Optionnel — créer une migration et l'appliquer (dev):

```bash
npx prisma migrate dev --name init
```

2) Ou exécuter le SQL directement (PostgreSQL)

- Si vous préférez exécuter un script SQL directement (psql), utilisez le fichier `db/create_tables.sql`.

```bash
# sous PowerShell
$env:DATABASE_URL = "postgresql://postgres:123456@localhost:5432/football_db"
psql $env:DATABASE_URL -f db/create_tables.sql
```

ou avec la CLI psql classique:

```bash
psql "postgresql://postgres:123456@localhost:5432/football_db" -f db/create_tables.sql
```

3) Peupler des comptes de test

- Après avoir créé les tables, vous pouvez utiliser le endpoint `/api/auth/register` pour créer des utilisateurs de test (voir README ou exemple ci-dessous):

```http
POST /api/auth/register
Content-Type: application/json

{ "email":"test@exemple.com", "password":"Password123!", "name":"Test" }
```

Notes
- Préférez `npx prisma db push` si vous utilisez Prisma: il synchronise le schéma Prisma avec la BDD automatiquement.
- Si vous utilisez la commande `npx prisma generate`, assurez-vous que la version locale de `prisma` dans `package.json` est compatible avec votre schéma (v4.x si vous avez `url` dans `schema.prisma`).
- Si vous avez besoin, je peux ajouter un script de seed Node.js qui crée automatiquement des comptes admin/utilisateur.
