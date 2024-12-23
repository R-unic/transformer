import ts from "typescript";
import { TransformState } from "../transformer";
import { TransformAnyFunction } from "./transform-any-function";

export function VisitFunctionExpression(context: TransformState, node: ts.FunctionExpression) {
	const result = TransformAnyFunction(context, node);
	if (!result) return node;

	const [block] = result;

	return context.factory.updateFunctionExpression(
		node,
		node.modifiers,
		node.asteriskToken,
		node.name,
		node.typeParameters,
		node.parameters,
		node.type,
		block ?? node.body,
	);
}
