import ts from "typescript";
import { TransformState } from "../transformer";
import { TransformAnyFunction } from "./transform-any-function";

export function VisitArrowFunction(context: TransformState, node: ts.ArrowFunction) {
	const result = TransformAnyFunction(context, node);
	if (!result) return node;
	const [block] = result;

	return context.factory.updateArrowFunction(
		node,
		node.modifiers,
		node.typeParameters,
		node.parameters,
		node.type,
		node.equalsGreaterThanToken,
		block ?? node.body,
	);
}
