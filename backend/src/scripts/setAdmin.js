require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const email = (process.argv[2] || '').trim().toLowerCase();

if (!email) {
  console.error('Usage: node src/scripts/setAdmin.js <email>');
  process.exit(1);
}

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');

  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOneAndUpdate(
    { email },
    { role: 'admin', updatedAt: Date.now() },
    { new: true },
  );

  if (!user) throw new Error(`User not found: ${email}`);
  console.log(`Admin role granted: ${user.email}`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
