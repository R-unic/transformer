import ts from "typescript";
import { TransformMacro } from "../macro";
import { TransformContext } from "../transformer";
import { VisitGetType } from "./transform-get-type";

export function VisitCallExpression(state: TransformContext, node: ts.CallExpression) {
	const newNode = TransformMacro(node);
	const nodes = [VisitGetType(state, node), newNode].filter((v) => v !== undefined) as ts.Expression[];
	return nodes.length > 0 ? nodes : state.Transform(node);
}
