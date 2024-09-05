import ts from "typescript";
import { TransformContext } from "../transformer";
import { TransformAnyFunction } from "./transform-any-function";

export function VisitFunctionExpression(context: TransformContext, node: ts.FunctionExpression) {
	const result = TransformAnyFunction(context, node);
	if (!result) return node;

	const [updatedNode, block] = result;

	return context.factory.updateFunctionExpression(
		updatedNode,
		updatedNode.modifiers,
		updatedNode.asteriskToken,
		updatedNode.name,
		updatedNode.typeParameters,
		updatedNode.parameters,
		updatedNode.type,
		block ?? updatedNode.body,
	);
}