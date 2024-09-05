/* eslint-disable @typescript-eslint/no-explicit-any */
import { ObjectLiteralExpression } from "typescript";
import { ConvertValueToExpression } from ".";
import { f } from "../helpers/factory";

export function ConvertObjectToExpression(object: Record<string, any>): ObjectLiteralExpression {
	return f.object(
		Object.entries(object).map(([key, value]) => {
			return f.propertyAssignmentDeclaration(key, ConvertValueToExpression(value));
		}),
		false,
	);
}
