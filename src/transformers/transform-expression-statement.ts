import ts from "typescript";
import { CollectCallExpressionChain, IsCallExpressionWithGeneric, ResolveChain } from "../helpers/call-expressions";
import { TransformContext } from "../transformer";

export function VisitExpressionStatement(state: TransformContext, node: ts.ExpressionStatement) {
	if (ts.isCallExpression(node.expression)) {
		let haveCallExpressWithGeneric = false;

		const chain = CollectCallExpressionChain(node.expression, (node) => {
			if (!IsCallExpressionWithGeneric(node)) return;
			haveCallExpressWithGeneric = true;
		});

		return !haveCallExpressWithGeneric ? state.Transform(node) : ResolveChain(chain);
	}

	return state.Transform(node);
}
