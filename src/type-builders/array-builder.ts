/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArrayLiteralExpression } from "typescript";
import { ConvertValueToExpression } from ".";
import { f } from "../helpers/factory";

export function ConvertArrayToExpression(object: any[]): ArrayLiteralExpression {
	return f.array(
		object.map((value) => {
			return ConvertValueToExpression(value);
		}),
		false,
	);
}
