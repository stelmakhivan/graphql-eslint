import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath));
pkg.resolutions = pkg.resolutions || {};

const version = process.argv[2];

if (pkg.resolutions.graphql.startsWith(version)) {
  console.info(`GraphQL v${version} is match! Skipping.`);
  process.exit(0);
}

pkg.resolutions.graphql = version.includes('-') ? version : `^${version}`;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
