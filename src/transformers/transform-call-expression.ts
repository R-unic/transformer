import ts from "typescript";
import { TransformMacro } from "../macro";
import { TransformContext } from "../transformer";
import { VisitGetType } from "./transform-get-type";

export function VisitCallExpression(state: TransformContext, node: ts.CallExpression) {
	const newNode = TransformMacro(node);
	if (newNode) {
		return newNode;
	}

	return VisitGetType(state, node);
}
