import { getLocation, requireGraphQLSchemaFromContext } from '../utils';
import { GraphQLESLintRule } from '../types';

const NO_DEPRECATED = 'NO_DEPRECATED';

const rule: GraphQLESLintRule<[], true> = {
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Operations',
      description: `Enforce that deprecated fields or enum values are not in use by operations.`,
      url: `https://github.com/dotansimha/graphql-eslint/blob/master/docs/rules/no-deprecated.md`,
      requiresSchema: true,
      examples: [
        {
          title: 'Incorrect (field)',
          code: /* GraphQL */ `
            # In your schema
            type User {
              id: ID!
              name: String! @deprecated(reason: "old field, please use fullName instead")
              fullName: String!
            }

            # Query
            query user {
              user {
                name # This is deprecated, so you'll get an error
              }
            }
          `,
        },
        {
          title: 'Incorrect (enum value)',
          code: /* GraphQL */ `
            # In your schema
            type Mutation {
              changeSomething(type: SomeType): Boolean!
            }

            enum SomeType {
              NEW
              OLD @deprecated(reason: "old field, please use NEW instead")
            }

            # Mutation
            mutation {
              changeSomething(
                type: OLD # This is deprecated, so you'll get an error
              ) {
                ...
              }
            }
          `,
        },
        {
          title: 'Correct',
          code: /* GraphQL */ `
            # In your schema
            type User {
              id: ID!
              name: String! @deprecated(reason: "old field, please use fullName instead")
              fullName: String!
            }

            # Query
            query user {
              user {
                id
                fullName
              }
            }
          `,
        },
      ],
      recommended: true,
    },
    messages: {
      [NO_DEPRECATED]: `This {{ type }} is marked as deprecated in your GraphQL schema (reason: {{ reason }})`,
    },
    schema: [],
  },
  create(context) {
    requireGraphQLSchemaFromContext('no-deprecated', context);

    return {
      EnumValue(node) {
        const typeInfo = node.typeInfo();
        const reason = typeInfo.enumValue?.deprecationReason;

        if (reason) {
          const enumValueName = node.value;
          context.report({
            loc: getLocation(node.loc, enumValueName),
            messageId: NO_DEPRECATED,
            data: {
              type: 'enum value',
              reason,
            },
          });
        }
      },
      Field(node) {
        const typeInfo = node.typeInfo();
        const reason = typeInfo.fieldDef?.deprecationReason;

        if (reason) {
          const fieldName = node.name.value;
          context.report({
            loc: getLocation(node.loc, fieldName),
            messageId: NO_DEPRECATED,
            data: {
              type: 'field',
              reason,
            },
          });
        }
      },
    };
  },
};

export default rule;
