/* eslint-disable @typescript-eslint/no-explicit-any */
import ts, { ObjectLiteralExpression } from "typescript";
import { ConvertValueToExpression } from ".";

const factory = ts.factory;

export function ConvertObjectToExpression(object: Record<string, any>): ObjectLiteralExpression {
	return factory.createObjectLiteralExpression(
		Object.entries(object).map(([key, value]) => {
			return factory.createPropertyAssignment(key, ConvertValueToExpression(value));
		}),
		false,
	);
}
