/* eslint-disable @typescript-eslint/no-explicit-any */
import ts, { NewExpression } from "typescript";
import { ConvertValueToExpression } from ".";

const factory = ts.factory;

export function ConvertMapToExpression(map: Map<any, any>): NewExpression {
	return factory.createNewExpression(
		factory.createIdentifier("Map"),
		[
			factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
			factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
		],
		[
			factory.createArrayLiteralExpression(
				Array.from(map.entries()).map(([key, value]) => {
					return factory.createArrayLiteralExpression(
						[ConvertValueToExpression(key), ConvertValueToExpression(value)],
						false,
					);
				}),
			),
		],
	);
}
