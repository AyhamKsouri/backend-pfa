require('dotenv').config();
const prisma = require('../config/prisma');

const email = process.argv[2];

if (!email) {
  console.error('Usage: node src/scripts/setAdmin.js <email>');
  process.exit(1);
}

async function setAdmin() {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });
    console.log(`✅ User ${user.email} is now an ADMIN.`);
  } catch (error) {
    if (error.code === 'P2025') {
      console.error(`❌ Error: User with email "${email}" not found.`);
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

setAdmin();
