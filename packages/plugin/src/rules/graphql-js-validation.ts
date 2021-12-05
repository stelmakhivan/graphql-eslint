/* eslint-disable @typescript-eslint/no-var-requires */
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { validate, GraphQLSchema, DocumentNode, ASTNode, ValidationRule } from 'graphql';
import { validateSDL } from 'graphql/validation/validate';
import { parseImportLine, processImport } from '@graphql-tools/import';
import { GraphQLESLintRule, GraphQLESLintRuleContext } from '../types';
import { getLocation, requireGraphQLSchemaFromContext, requireSiblingsOperations } from '../utils';
import { GraphQLESTreeNode } from '../estree-parser';

function extractRuleName(stack?: string): string | null {
  const match = (stack || '').match(/validation[/\\]rules[/\\](.*?)\.js:/) || [];
  return match[1] || null;
}

export function validateDoc(
  sourceNode: GraphQLESTreeNode<ASTNode>,
  context: GraphQLESLintRuleContext,
  schema: GraphQLSchema | null,
  documentNode: DocumentNode,
  rules: ReadonlyArray<ValidationRule>,
  ruleName: string | null = null
): void {
  if (documentNode?.definitions?.length > 0) {
    try {
      const validationErrors = schema
        ? validate(schema, documentNode, rules)
        : validateSDL(documentNode, null, rules as any);

      for (const error of validationErrors) {
        const validateRuleName = ruleName || `[${extractRuleName(error.stack)}]`;
        context.report({
          loc: getLocation({ start: error.locations[0] }),
          message: ruleName ? error.message : `${validateRuleName} ${error.message}`,
        });
      }
    } catch (e) {
      context.report({
        node: sourceNode,
        message: e.message,
      });
    }
  }
}

const isGraphQLImportFile = rawSDL => {
  const trimmedRawSDL = rawSDL.trimStart();
  return trimmedRawSDL.startsWith('# import') || trimmedRawSDL.startsWith('#import');
};

const validationToRule = (
  ruleId: string,
  docs: GraphQLESLintRule['meta']['docs'],
  getDocumentNode?: (context: GraphQLESLintRuleContext) => DocumentNode | null
): Record<string, GraphQLESLintRule<any, true>> => {
  let ruleFn: null | ValidationRule = null;

  try {
    ruleFn = require(`graphql/validation/rules/${docs.graphQLJSRuleName}Rule`)[`${docs.graphQLJSRuleName}Rule`];
  } catch (e) {
    try {
      ruleFn = require(`graphql/validation/rules/${docs.graphQLJSRuleName}`)[`${docs.graphQLJSRuleName}Rule`];
    } catch (e) {
      ruleFn = require('graphql/validation')[`${docs.graphQLJSRuleName}Rule`];
    }
  }

  return {
    [ruleId]: {
      meta: {
        docs: {
          recommended: true,
          ...docs,
          url: `https://github.com/dotansimha/graphql-eslint/blob/master/docs/rules/${ruleId}.md`,
          description: `${docs.description}\n\n> This rule is a wrapper around a \`graphql-js\` validation function. [You can find its source code here](https://github.com/graphql/graphql-js/blob/main/src/validation/rules/${docs.graphQLJSRuleName}Rule.ts).`,
        },
      },
      create(context) {
        return {
          Document(node) {
            if (!ruleFn) {
              // eslint-disable-next-line no-console
              console.warn(
                `You rule "${ruleId}" depends on a GraphQL validation rule ("${docs.graphQLJSRuleName}") but it's not available in the "graphql-js" version you are using. Skipping...`
              );
              return;
            }

            const schema = docs.requiresSchema ? requireGraphQLSchemaFromContext(ruleId, context) : null;

            let documentNode: DocumentNode;
            const isRealFile = existsSync(context.getFilename());
            if (isRealFile && getDocumentNode) {
              documentNode = getDocumentNode(context);
            }
            validateDoc(node, context, schema, documentNode || node.rawNode(), [ruleFn], docs.graphQLJSRuleName);
          },
        };
      },
    },
  };
};

const importFiles = (context: GraphQLESLintRuleContext) => {
  const code = context.getSourceCode().text;
  if (!isGraphQLImportFile(code)) {
    return null;
  }
  // Import documents because file contains '#import' comments
  return processImport(context.getFilename());
};

export const GRAPHQL_JS_VALIDATIONS: Record<string, GraphQLESLintRule> = Object.assign(
  {},
  validationToRule('executable-definitions', {
    category: 'Operations',
    description: `A GraphQL document is only valid for execution if all definitions are either operation or fragment definitions.`,
    graphQLJSRuleName: 'ExecutableDefinitions',
    requiresSchema: true,
  }),
  validationToRule('fields-on-correct-type', {
    category: 'Operations',
    description:
      'A GraphQL document is only valid if all fields selected are defined by the parent type, or are an allowed meta field such as `__typename`.',
    graphQLJSRuleName: 'FieldsOnCorrectType',
    requiresSchema: true,
  }),
  validationToRule('fragments-on-composite-type', {
    category: 'Operations',
    description: `Fragments use a type condition to determine if they apply, since fragments can only be spread into a composite type (object, interface, or union), the type condition must also be a composite type.`,
    graphQLJSRuleName: 'FragmentsOnCompositeTypes',
    requiresSchema: true,
  }),
  validationToRule('known-argument-names', {
    category: ['Schema', 'Operations'],
    description: `A GraphQL field is only valid if all supplied arguments are defined by that field.`,
    graphQLJSRuleName: 'KnownArgumentNames',
    requiresSchema: true,
  }),
  validationToRule('known-directives', {
    category: ['Schema', 'Operations'],
    description: `A GraphQL document is only valid if all \`@directives\` are known by the schema and legally positioned.`,
    graphQLJSRuleName: 'KnownDirectives',
    requiresSchema: true,
  }),
  validationToRule(
    'known-fragment-names',
    {
      category: 'Operations',
      description: `A GraphQL document is only valid if all \`...Fragment\` fragment spreads refer to fragments defined in the same document.`,
      graphQLJSRuleName: 'KnownFragmentNames',
      requiresSchema: true,
      examples: [
        {
          title: 'Incorrect (fragment not defined in the document)',
          code: /* GraphQL */ `
            query {
              user {
                id
                ...UserFields
              }
            }
          `,
        },
        {
          title: 'Correct',
          code: /* GraphQL */ `
            fragment UserFields on User {
              firstName
              lastName
            }

            query {
              user {
                id
                ...UserFields
              }
            }
          `,
        },
        {
          title: 'Correct (existing import to UserFields fragment)',
          code: /* GraphQL */ `
            #import '../UserFields.gql'

            query {
              user {
                id
                ...UserFields
              }
            }
          `,
        },
        {
          title:
            "False positive case\n\nFor extracting documents from code under the hood we use [graphql-tag-pluck](https://graphql-tools.com/docs/graphql-tag-pluck) that [don't support string interpolation](https://stackoverflow.com/questions/62749847/graphql-codegen-dynamic-fields-with-interpolation/62751311#62751311) for this moment.",
          code: `
            const USER_FIELDS = gql\`
              fragment UserFields on User {
                id
              }
            \`
            
            const GET_USER = /* GraphQL */ \`
              # eslint @graphql-eslint/known-fragment-names: 'error'

              query User {
                user {
                  ...UserFields
                }
              }

              # Will give false positive error 'Unknown fragment "UserFields"'
              \${USER_FIELDS}
            \``,
        },
      ],
    },
    importFiles
  ),
  validationToRule('known-type-names', {
    category: ['Schema', 'Operations'],
    description: `A GraphQL document is only valid if referenced types (specifically variable definitions and fragment conditions) are defined by the type schema.`,
    graphQLJSRuleName: 'KnownTypeNames',
    requiresSchema: true,
  }),
  validationToRule('lone-anonymous-operation', {
    category: 'Operations',
    description: `A GraphQL document is only valid if when it contains an anonymous operation (the query short-hand) that it contains only that one operation definition.`,
    graphQLJSRuleName: 'LoneAnonymousOperation',
    requiresSchema: true,
  }),
  validationToRule('lone-schema-definition', {
    category: 'Schema',
    description: `A GraphQL document is only valid if it contains only one schema definition.`,
    graphQLJSRuleName: 'LoneSchemaDefinition',
  }),
  validationToRule('no-fragment-cycles', {
    category: 'Operations',
    description: `A GraphQL fragment is only valid when it does not have cycles in fragments usage.`,
    graphQLJSRuleName: 'NoFragmentCycles',
    requiresSchema: true,
  }),
  validationToRule(
    'no-undefined-variables',
    {
      category: 'Operations',
      description: `A GraphQL operation is only valid if all variables encountered, both directly and via fragment spreads, are defined by that operation.`,
      graphQLJSRuleName: 'NoUndefinedVariables',
      requiresSchema: true,
    },
    importFiles
  ),
  validationToRule(
    'no-unused-fragments',
    {
      category: 'Operations',
      description: `A GraphQL document is only valid if all fragment definitions are spread within operations, or spread within other fragments spread within operations.`,
      graphQLJSRuleName: 'NoUnusedFragments',
      requiresSchema: true,
      requiresSiblings: true,
    },
    context => {
      const siblings = requireSiblingsOperations('no-unused-fragments', context);
      const documents = [...siblings.getOperations(), ...siblings.getFragments()]
        .filter(({ document }) => isGraphQLImportFile(document.loc.source.body))
        .map(({ filePath, document }) => ({
          filePath,
          code: document.loc.source.body,
        }));

      const getParentNode = (filePath: string): DocumentNode | null => {
        for (const { filePath: docFilePath, code } of documents) {
          const isFileImported = code
            .split('\n')
            .filter(isGraphQLImportFile)
            .map(line => parseImportLine(line.replace('#', '')))
            .some(o => filePath === join(dirname(docFilePath), o.from));

          if (!isFileImported) {
            continue;
          }

          // Import first file that import this file
          const document = processImport(docFilePath);
          // Import most top file that import this file
          return getParentNode(docFilePath) || document;
        }

        return null;
      };

      return getParentNode(context.getFilename());
    }
  ),
  validationToRule(
    'no-unused-variables',
    {
      category: 'Operations',
      description: `A GraphQL operation is only valid if all variables defined by an operation are used, either directly or within a spread fragment.`,
      graphQLJSRuleName: 'NoUnusedVariables',
      requiresSchema: true,
    },
    importFiles
  ),
  validationToRule('overlapping-fields-can-be-merged', {
    category: 'Operations',
    description: `A selection set is only valid if all fields (including spreading any fragments) either correspond to distinct response names or can be merged without ambiguity.`,
    graphQLJSRuleName: 'OverlappingFieldsCanBeMerged',
    requiresSchema: true,
  }),
  validationToRule('possible-fragment-spread', {
    category: 'Operations',
    description: `A fragment spread is only valid if the type condition could ever possibly be true: if there is a non-empty intersection of the possible parent types, and possible types which pass the type condition.`,
    graphQLJSRuleName: 'PossibleFragmentSpreads',
    requiresSchema: true,
  }),
  validationToRule('possible-type-extension', {
    category: 'Schema',
    description: `A type extension is only valid if the type is defined and has the same kind.`,
    graphQLJSRuleName: 'PossibleTypeExtensions',
    recommended: false, // TODO: enable after https://github.com/dotansimha/graphql-eslint/issues/787 will be fixed
    isDisabledForAllConfig: true,
  }),
  validationToRule('provided-required-arguments', {
    category: ['Schema', 'Operations'],
    description: `A field or directive is only valid if all required (non-null without a default value) field arguments have been provided.`,
    graphQLJSRuleName: 'ProvidedRequiredArguments',
    requiresSchema: true,
  }),
  validationToRule('scalar-leafs', {
    category: 'Operations',
    description: `A GraphQL document is valid only if all leaf fields (fields without sub selections) are of scalar or enum types.`,
    graphQLJSRuleName: 'ScalarLeafs',
    requiresSchema: true,
  }),
  validationToRule('one-field-subscriptions', {
    category: 'Operations',
    description: `A GraphQL subscription is valid only if it contains a single root field.`,
    graphQLJSRuleName: 'SingleFieldSubscriptions',
    requiresSchema: true,
  }),
  validationToRule('unique-argument-names', {
    category: 'Operations',
    description: `A GraphQL field or directive is only valid if all supplied arguments are uniquely named.`,
    graphQLJSRuleName: 'UniqueArgumentNames',
    requiresSchema: true,
  }),
  validationToRule('unique-directive-names', {
    category: 'Schema',
    description: `A GraphQL document is only valid if all defined directives have unique names.`,
    graphQLJSRuleName: 'UniqueDirectiveNames',
  }),
  validationToRule('unique-directive-names-per-location', {
    category: ['Schema', 'Operations'],
    description: `A GraphQL document is only valid if all non-repeatable directives at a given location are uniquely named.`,
    graphQLJSRuleName: 'UniqueDirectivesPerLocation',
    requiresSchema: true,
  }),
  validationToRule('unique-enum-value-names', {
    category: 'Schema',
    description: `A GraphQL enum type is only valid if all its values are uniquely named.`,
    graphQLJSRuleName: 'UniqueEnumValueNames',
    recommended: false,
    isDisabledForAllConfig: true,
  }),
  validationToRule('unique-field-definition-names', {
    category: 'Schema',
    description: `A GraphQL complex type is only valid if all its fields are uniquely named.`,
    graphQLJSRuleName: 'UniqueFieldDefinitionNames',
  }),
  validationToRule('unique-input-field-names', {
    category: 'Operations',
    description: `A GraphQL input object value is only valid if all supplied fields are uniquely named.`,
    graphQLJSRuleName: 'UniqueInputFieldNames',
  }),
  validationToRule('unique-operation-types', {
    category: 'Schema',
    description: `A GraphQL document is only valid if it has only one type per operation.`,
    graphQLJSRuleName: 'UniqueOperationTypes',
  }),
  validationToRule('unique-type-names', {
    category: 'Schema',
    description: `A GraphQL document is only valid if all defined types have unique names.`,
    graphQLJSRuleName: 'UniqueTypeNames',
  }),
  validationToRule('unique-variable-names', {
    category: 'Operations',
    description: `A GraphQL operation is only valid if all its variables are uniquely named.`,
    graphQLJSRuleName: 'UniqueVariableNames',
    requiresSchema: true,
  }),
  validationToRule('value-literals-of-correct-type', {
    category: 'Operations',
    description: `A GraphQL document is only valid if all value literals are of the type expected at their position.`,
    graphQLJSRuleName: 'ValuesOfCorrectType',
    requiresSchema: true,
  }),
  validationToRule('variables-are-input-types', {
    category: 'Operations',
    description: `A GraphQL operation is only valid if all the variables it defines are of input types (scalar, enum, or input object).`,
    graphQLJSRuleName: 'VariablesAreInputTypes',
    requiresSchema: true,
  }),
  validationToRule('variables-in-allowed-position', {
    category: 'Operations',
    description: `Variables passed to field arguments conform to type.`,
    graphQLJSRuleName: 'VariablesInAllowedPosition',
    requiresSchema: true,
  })
);
