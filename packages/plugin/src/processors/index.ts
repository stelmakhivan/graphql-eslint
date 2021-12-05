import { createGraphqlProcessor } from './code-files';

const EXTRACTABLE_FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', 'graphql'];
const processor = createGraphqlProcessor();

export const processors = Object.fromEntries(EXTRACTABLE_FILE_EXTENSIONS.map(( ext) => [ext, processor]));
