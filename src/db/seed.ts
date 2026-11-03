import bcrypt from 'bcrypt';
import { closeDatabase, db } from '../config/database.js';
import { users } from './schema.js';
import { seedCatalog } from './seed/catalog.js';

const SEED_PASSWORD = 'Schoolyshop123!';

const SEED_USERS = [
  {
    name: 'Admin Schoolyshop',
    email: 'admin@schoolyshop.test',
    role: 'admin' as const,
  },
  {
    name: 'User Schoolyshop',
    email: 'user@schoolyshop.test',
    role: 'user' as const,
  },
];

async function seed(): Promise<void> {
  for (const seedUser of SEED_USERS) {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

    await db
      .insert(users)
      .values({
        name: seedUser.name,
        email: seedUser.email,
        passwordHash,
        role: seedUser.role,
        status: 'active',
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: seedUser.name,
          passwordHash,
          role: seedUser.role,
          status: 'active',
          updatedAt: new Date(),
        },
      });
  }

  console.log(`Seeded ${SEED_USERS.length} users (password: ${SEED_PASSWORD})`);
  await seedCatalog();
}

try {
  await seed();
} catch (error) {
  console.error('Failed to seed database', error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
