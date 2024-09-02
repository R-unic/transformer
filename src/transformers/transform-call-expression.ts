import ts from "typescript";
import { TransformMacro } from "../macro";
import { TransformContext } from "../transformer";
import { TransformCallExpressionChain } from "./transform-call-expression-chain";
import { VisitGetType } from "./transform-get-type";

export function VisitCallExpression(state: TransformContext, node: ts.CallExpression) {
	let newNode = TransformMacro(node);
	if (newNode) {
		return newNode;
	}

	newNode = VisitGetType(state, node);
	if (newNode) {
		return newNode;
	}

	return TransformCallExpressionChain(state, node);
}
