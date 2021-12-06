import { Location, TokenKind, GraphQLOutputType, GraphQLNamedType, isNonNullType, isListType } from 'graphql';
import { valueFromASTUntyped } from 'graphql/utilities/valueFromASTUntyped';
import { Comment } from 'estree';

export const valueFromNode = (...args: Parameters<typeof valueFromASTUntyped>): any => {
  return valueFromASTUntyped(...args);
};

export function getBaseType(type: GraphQLOutputType): GraphQLNamedType {
  if (isNonNullType(type) || isListType(type)) {
    return getBaseType(type.ofType);
  }
  return type;
}

export function extractCommentsFromAst(loc: Location): Comment[] {
  if (!loc) {
    return [];
  }
  const comments: Comment[] = [];
  let token = loc.startToken;

  while (token !== null) {
    const { kind, value, line, column, start, end, next } = token;
    if (kind === TokenKind.COMMENT) {
      comments.push({
        type: 'Block',
        value,
        loc: {
          start: { line, column },
          end: { line, column },
        },
        range: [start, end],
      });
    }
    token = next;
  }
  return comments;
}
