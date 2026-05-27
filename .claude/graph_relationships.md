# debt-crusher Graph Relationships

       ## Service Dependency Graph
       debt-crusher
-> Next.js forms-first finance workspace
-> Prisma persistence layer
-> local workbook and JSON import/export tools
-> Database: Prisma-managed relational database
-> Database: SQLite or file-backed local data store
-> API: server actions or route handlers behind the app-owned save/import/export flows
-> Async: snapshot history creation on import/save
-> Async: import/export generation
-> Deployment: Local Next.js app today; data model is intentionally shaped so the datasource can later switch to hosted Postgres/Neon.

       ## Runtime Dependency Graph
       debt-crusher
-> Runtime: Node.js
-> Runtime: Next.js
-> Runtime: React
-> Runtime: TypeScript
-> Runtime: CSS
-> Runtime: JavaScript

       ## Database Relationship Graph
       debt-crusher
-> Prisma-managed relational database
-> SQLite or file-backed local data store

       ## API Consumer / Provider Graph
       debt-crusher
-> server actions or route handlers behind the app-owned save/import/export flows

       ## Queue Publisher / Consumer Graph
       debt-crusher
-> snapshot history creation on import/save
-> import/export generation

       ## Shared Package Dependency Graph
       debt-crusher
-> `@prisma/client` / `prisma`

       ## Deployment Relationship Graph
       debt-crusher
       - Local Next.js app today; data model is intentionally shaped so the datasource can later switch to hosted Postgres/Neon.

       ## Cross-Repo Relationship Graph
       debt-crusher
-> no runtime dependency on sibling repos by default
