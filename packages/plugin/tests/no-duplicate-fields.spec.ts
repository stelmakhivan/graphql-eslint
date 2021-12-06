import { GraphQLRuleTester } from '../src';
import rule from '../src/rules/no-duplicate-fields';

const ruleTester = new GraphQLRuleTester();

ruleTester.runGraphQLTests('no-duplicate-fields', rule, {
  valid: [],
  invalid: [
    {
      code: /* GraphQL */ `
        query test($v: String, $t: String, $v: String) {
          id
        }
      `,
      errors: [{ message: 'Operation variable "v" defined multiple times' }],
    },
    {
      code: /* GraphQL */ `
        query test {
          users(first: 100, after: 10, filter: "test", first: 50) {
            id
          }
        }
      `,
      errors: [{ message: 'Field argument "first" defined multiple times' }],
    },
    {
      code: /* GraphQL */ `
        query test {
          users {
            id
            name
            email
            name
          }
        }
      `,
      errors: [{ message: 'Field "name" defined multiple times' }],
    },
    {
      code: /* GraphQL */ `
        query test {
          users {
            id
            name
            email
            email: somethingElse
          }
        }
      `,
      errors: [{ message: 'Field "email" defined multiple times' }],
    },
  ],
});
