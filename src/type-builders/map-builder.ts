/* eslint-disable @typescript-eslint/no-explicit-any */
import ts, { NewExpression } from "typescript";
import { ConvertValueToExpression } from ".";
import { f } from "../helpers/factory";

export function ConvertMapToExpression(map: Map<any, any>): NewExpression {
	return f.factory.createNewExpression(
		f.identifier("Map"),
		[f.keywordType(ts.SyntaxKind.AnyKeyword), f.keywordType(ts.SyntaxKind.AnyKeyword)],
		[
			f.array(
				Array.from(map.entries()).map(([key, value]) => {
					return f.array([ConvertValueToExpression(key), ConvertValueToExpression(value)], false);
				}),
			),
		],
	);
}
