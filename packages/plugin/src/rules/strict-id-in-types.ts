import { Kind, ObjectTypeDefinitionNode } from 'graphql';
import { GraphQLESTreeNode } from '../estree-parser';
import { GraphQLESLintRule } from '../types';
import { getLocation } from '../utils';

export interface ExceptionRule {
  types?: string[];
  suffixes?: string[];
}

type StrictIdInTypesRuleConfig = {
  acceptedIdNames?: string[];
  acceptedIdTypes?: string[];
  exceptions?: ExceptionRule;
};

interface ShouldIgnoreNodeParams {
  node: GraphQLESTreeNode<ObjectTypeDefinitionNode>;
  exceptions: ExceptionRule;
}

const shouldIgnoreNode = ({ node, exceptions }: ShouldIgnoreNodeParams): boolean => {
  const rawNode = node.rawNode();
  const name = rawNode.name.value;

  return exceptions.types?.includes(name) || exceptions.suffixes?.some(suffix => name.endsWith(suffix));
};

const STRICT_ID_IN_TYPES = 'STRICT_ID_IN_TYPES';

const rule: GraphQLESLintRule<[StrictIdInTypesRuleConfig]> = {
  meta: {
    type: 'suggestion',
    docs: {
      description: `Requires output types to have one unique identifier unless they do not have a logical one. Exceptions can be used to ignore output types that do not have unique identifiers.`,
      category: 'Schema',
      recommended: true,
      url: 'https://github.com/dotansimha/graphql-eslint/blob/master/docs/rules/strict-id-in-types.md',
      examples: [
        {
          title: 'Incorrect',
          usage: [
            {
              acceptedIdNames: ['id', '_id'],
              acceptedIdTypes: ['ID'],
              exceptions: { suffixes: ['Payload'] },
            },
          ],
          code: /* GraphQL */ `
            # Incorrect field name
            type InvalidFieldName {
              key: ID!
            }

            # Incorrect field type
            type InvalidFieldType {
              id: String!
            }

            # Incorrect exception suffix
            type InvalidSuffixResult {
              data: String!
            }

            # Too many unique identifiers. Must only contain one.
            type InvalidFieldName {
              id: ID!
              _id: ID!
            }
          `,
        },
        {
          title: 'Correct',
          usage: [
            {
              acceptedIdNames: ['id', '_id'],
              acceptedIdTypes: ['ID'],
              exceptions: { types: ['Error'], suffixes: ['Payload'] },
            },
          ],
          code: /* GraphQL */ `
            type User {
              id: ID!
            }

            type Post {
              _id: ID!
            }

            type CreateUserPayload {
              data: String!
            }

            type Error {
              message: String!
            }
          `,
        },
      ],
    },
    schema: {
      type: 'array',
      maxItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          acceptedIdNames: {
            type: 'array',
            uniqueItems: true,
            items: {
              type: 'string',
            },
            default: ['id'],
          },
          acceptedIdTypes: {
            type: 'array',
            uniqueItems: true,
            items: {
              type: 'string',
            },
            default: ['ID'],
          },
          exceptions: {
            type: 'object',
            properties: {
              types: {
                type: 'array',
                uniqueItems: true,
                minItems: 1,
                description: 'This is used to exclude types with names that match one of the specified values.',
                items: {
                  type: 'string',
                },
              },
              suffixes: {
                type: 'array',
                uniqueItems: true,
                minItems: 1,
                description:
                  'This is used to exclude types with names with suffixes that match one of the specified values.',
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    messages: {
      [STRICT_ID_IN_TYPES]: `{{ typeName }} must have exactly one non-nullable unique identifier. Accepted name(s): {{ acceptedNamesString }}; Accepted type(s): {{ acceptedTypesString }}.`,
    },
  },
  create(context) {
    const options: StrictIdInTypesRuleConfig = {
      acceptedIdNames: ['id'],
      acceptedIdTypes: ['ID'],
      exceptions: {},
      ...context.options[0],
    };

    return {
      ObjectTypeDefinition(node) {
        if (shouldIgnoreNode({ node, exceptions: options.exceptions })) {
          return;
        }

        const validIds = node.fields.filter(field => {
          const fieldNode = field.rawNode();

          const isValidIdName = options.acceptedIdNames.includes(fieldNode.name.value);

          // To be a valid type, it must be non-null and one of the accepted types.
          let isValidIdType = false;
          if (fieldNode.type.kind === Kind.NON_NULL_TYPE && fieldNode.type.type.kind === Kind.NAMED_TYPE) {
            isValidIdType = options.acceptedIdTypes.includes(fieldNode.type.type.name.value);
          }

          return isValidIdName && isValidIdType;
        });

        const typeName = node.name.value;
        // Usually, there should be only one unique identifier field per type.
        // Some clients allow multiple fields to be used. If more people need this,
        // we can extend this rule later.
        if (validIds.length !== 1) {
          context.report({
            loc: getLocation(node.name.loc, typeName),
            messageId: STRICT_ID_IN_TYPES,
            data: {
              typeName,
              acceptedNamesString: options.acceptedIdNames.join(', '),
              acceptedTypesString: options.acceptedIdTypes.join(', '),
            },
          });
        }
      },
    };
  },
};

export default rule;
