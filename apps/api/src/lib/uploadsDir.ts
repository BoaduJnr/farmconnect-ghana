import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

// Resolve apps/api/uploads regardless of whether this runs from src (tsx) or dist (tsc build)
// and regardless of the process's cwd (see config/env.ts for the same pattern).
const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(currentDir, '../../uploads');

mkdirSync(UPLOADS_DIR, { recursive: true });
