let prisma;
try {
	const { PrismaClient } = require('@prisma/client');
	prisma = new PrismaClient();
} catch (err) {
	console.error('Prisma client could not be loaded. Have you run `npm install` and `npx prisma generate`?');
	console.error('Original error:', err.message);

	// Export a proxy that throws a helpful error when used, so the app can fail gracefully
	const handler = {
		get() {
			return () => {
				throw new Error('Prisma client is not available. Run `npm install` and `npx prisma generate` to generate the client.');
			};
		}
	};

	prisma = new Proxy({}, handler);
}

module.exports = prisma;
