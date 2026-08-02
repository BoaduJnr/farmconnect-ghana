// Creates (or promotes) an admin account. There is no self-service admin signup — the public
// role-selection endpoint only accepts FARMER/BUYER (see selectRoleSchema) — so this is the only
// way to get an ADMIN user into the system. Admins still log in exactly like everyone else
// (phone + OTP); this script just seeds the User row with role=ADMIN ahead of time.
//
// Usage:
//   npm run prisma:seed -- --phone 0241234567 --name "Ama Admin"
// or via env vars:
//   ADMIN_PHONE=0241234567 ADMIN_NAME="Ama Admin" npm run prisma:seed
import { Locale, phoneSchema, Role } from '@farmconnect/shared';
import { prisma } from '../src/lib/prisma.js';

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const rawPhone = readArg('--phone') ?? process.env.ADMIN_PHONE;
  const name = readArg('--name') ?? process.env.ADMIN_NAME;

  if (!rawPhone) {
    console.error(
      'No admin phone provided. Usage: npm run prisma:seed -- --phone 0241234567 --name "Ama Admin"\n' +
        '(or set ADMIN_PHONE / ADMIN_NAME env vars)',
    );
    process.exitCode = 1;
    return;
  }

  const phone = phoneSchema.parse(rawPhone);

  const user = await prisma.user.upsert({
    where: { phone },
    create: { phone, role: Role.ADMIN, locale: Locale.EN, name, isVerified: true },
    update: { role: Role.ADMIN, isVerified: true, isSuspended: false, ...(name ? { name } : {}) },
  });

  console.log(`Admin ready: ${user.phone} (${user.name ?? 'no name set'}) — id ${user.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
