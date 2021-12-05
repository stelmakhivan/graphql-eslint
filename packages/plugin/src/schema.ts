import { GraphQLSchema } from 'graphql';
import { GraphQLProjectConfig } from 'graphql-config';
import { asArray } from '@graphql-tools/utils';
import { ParserOptions } from './types';
import { loaderCache } from './utils';

const schemaCache = new Map<string, GraphQLSchema>();

export function getSchema(projectForFile: GraphQLProjectConfig, options: ParserOptions = {}): GraphQLSchema | null {
  const schemaKey = asArray(projectForFile.schema).sort().join(',');
  if (!schemaKey) {
    return null;
  }
  let schema = schemaCache.get(schemaKey);

  if (!schema) {
    schema = projectForFile.loadSchemaSync(projectForFile.schema, 'GraphQLSchema', {
      cache: loaderCache,
      ...options.schemaOptions,
    });
    schemaCache.set(schemaKey, schema);
  }

  return schema;
}
