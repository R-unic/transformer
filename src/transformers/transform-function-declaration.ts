import ts from "typescript";
import { TransformState } from "../transformer";
import { TransformAnyFunction } from "./transform-any-function";

export function VisitFunctionDeclaration(context: TransformState, node: ts.FunctionDeclaration) {
	const result = TransformAnyFunction(context, node);
	if (!result) return node;

	const [block] = result;

	return context.factory.updateFunctionDeclaration(
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
