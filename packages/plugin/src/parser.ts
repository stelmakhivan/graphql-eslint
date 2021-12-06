import { parseGraphQLSDL } from '@graphql-tools/utils';
import { GraphQLError, TypeInfo, Source } from 'graphql';
import { convertToESTree } from './estree-parser';
import { GraphQLESLintParseResult, ParserOptions, ParserServices } from './types';
import { getOnDiskFilepath, extractTokens } from './utils';
import { getSchema } from './schema';
import { getSiblingOperations } from './sibling-operations';
import { loadGraphqlConfig } from './graphql-config';
import { getReachableTypes, getUsedFields } from './graphql-ast';

export function parseForESLint(code: string, options: ParserOptions = {}): GraphQLESLintParseResult {
  const gqlConfig = loadGraphqlConfig(options);
  const filePath = options.filePath || '';
  const realFilepath = filePath ? getOnDiskFilepath(filePath) : null;
  const projectForFile = realFilepath ? gqlConfig.getProjectForFile(realFilepath) : gqlConfig.getDefault();

  const schema = getSchema(projectForFile, options);
  const parserServices: ParserServices = {
    schema,
    hasTypeInfo: schema !== null,
    siblingOperations: getSiblingOperations(projectForFile),
    reachableTypes: getReachableTypes,
    usedFields: getUsedFields,
  };

  try {
    const { document } = parseGraphQLSDL(filePath, code, {
      ...options.graphQLParserOptions,
      noLocation: false,
    });

    const { rootTree, comments } = convertToESTree(document, schema ? new TypeInfo(schema) : null);

    return {
      services: parserServices,
      ast: {
        comments,
        type: 'Program',
        sourceType: 'script',
        body: [rootTree as any],
        loc: rootTree.loc,
        range: rootTree.range as [number, number],
        tokens: extractTokens(new Source(code, filePath)),
      },
    };
  } catch (error) {
    error.message = `[graphql-eslint]: ${error.message}`;
    // In case of GraphQL parser error, we report it to ESLint as a parser error that matches the requirements
    // of ESLint. This will make sure to display it correctly in IDEs and lint results.
    if (error instanceof GraphQLError) {
      const eslintError = {
        index: error.positions[0],
        lineNumber: error.locations[0].line,
        column: error.locations[0].column,
        message: error.message,
      };
      throw eslintError;
    }
    throw error;
  }
}
