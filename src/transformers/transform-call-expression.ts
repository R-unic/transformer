import ts from "typescript";
import { TransformMacro } from "../macro";
import { TransformContext } from "../transformer";
import { VisitGetType } from "./transform-get-type";
import { TransformCallExpressionWithGeneric } from "./transofrm-call-expression-with-generic";

export function VisitCallExpression(state: TransformContext, node: ts.CallExpression) {
	const newNode = TransformMacro(node);
	if (newNode) {
		return newNode;
	}

	const prevNode = node;
	node = VisitGetType(state, node);
	if (prevNode !== node) return node;

	return TransformCallExpressionWithGeneric(state, node);
}
