require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./client');

const DEFAULT_ADMIN = {
  name: process.env.DEFAULT_ADMIN_NAME || 'Info Sport Admin',
  email: (process.env.DEFAULT_ADMIN_EMAIL || 'admin@info-sport.local').toLowerCase().trim(),
  password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!',
  role: 'admin',
  position: process.env.DEFAULT_ADMIN_POSITION || 'Coach',
  rating: Number.parseInt(process.env.DEFAULT_ADMIN_RATING || '90', 10)
};

async function seedDefaultAdmin() {
  if (!DEFAULT_ADMIN.password || DEFAULT_ADMIN.password.length < 6) {
    throw new Error('DEFAULT_ADMIN_PASSWORD must contain at least 6 characters');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN.email }
  });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: DEFAULT_ADMIN.name,
        role: 'admin',
        position: DEFAULT_ADMIN.position,
        rating: Number.isNaN(DEFAULT_ADMIN.rating) ? 90 : DEFAULT_ADMIN.rating,
        mustChangePassword: false
      }
    });

    console.log(`Default admin already exists: ${DEFAULT_ADMIN.email}`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, salt);

  await prisma.user.create({
    data: {
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      password: hashedPassword,
      role: 'admin',
      position: DEFAULT_ADMIN.position,
      rating: Number.isNaN(DEFAULT_ADMIN.rating) ? 90 : DEFAULT_ADMIN.rating,
      mustChangePassword: false
    }
  });

  console.log(`Default admin created: ${DEFAULT_ADMIN.email}`);
}

seedDefaultAdmin()
  .catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });