/* eslint-disable @typescript-eslint/no-explicit-any */
import ts, { ArrayLiteralExpression } from "typescript";
import { ConvertValueToExpression } from ".";

const factory = ts.factory;

export function ConvertArrayToExpression(object: any[]): ArrayLiteralExpression {
	return factory.createArrayLiteralExpression(
		object.map((value) => {
			return ConvertValueToExpression(value);
		}),
		false,
	);
}
