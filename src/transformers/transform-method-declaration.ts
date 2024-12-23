import ts from "typescript";
import { TransformState } from "../transformer";
import { TransformAnyFunction } from "./transform-any-function";

export function VisitMethodDeclaration(context: TransformState, node: ts.MethodDeclaration) {
	const result = TransformAnyFunction(context, node);
	if (!result) return node;

	const [block, modifiers] = result;

	return context.factory.updateMethodDeclaration(
		node,
		modifiers,
		node.asteriskToken,
		node.name,
		node.questionToken,
		node.typeParameters,
		node.parameters,
		node.type,
		block ?? node.body,
	);
}
