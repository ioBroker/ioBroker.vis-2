import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { defineVisHostConfig } from '@iobroker/types-vis-2/defineVisHostConfig';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineVisHostConfig({
    rootDir: __dirname,
});
