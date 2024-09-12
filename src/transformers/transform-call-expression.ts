import ts from "typescript";
import { TransformMacro } from "../macro";
import { TransformState } from "../transformer";
import { TransformCallExpressionChain } from "./transform-call-expression-chain";
import { VisitCreateAttribute } from "./transform-create-attribute";
import { VisitGetType } from "./transform-get-type";
import { VisitGetTypes } from "./transform-get-types";

export function VisitCallExpression(state: TransformState, node: ts.CallExpression) {
	let newNode = TransformMacro(node);
	if (newNode) {
		return newNode;
	}

	newNode = VisitGetType(state, node);
	if (newNode) {
		return newNode;
	}

	newNode = VisitGetTypes(state, node);
	if (newNode) {
		return newNode;
	}

	newNode = VisitCreateAttribute(state, node);
	if (newNode) {
		return newNode;
	}

	return TransformCallExpressionChain(state, node);
}
