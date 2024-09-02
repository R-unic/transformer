import ts from "typescript";
import { CollectCallExpressionChain, IsCallExpressionWithGeneric, ResolveChain } from "../helpers/call-expressions";
import { TransformContext } from "../transformer";

export function VisitVarriableStatement(state: TransformContext, node: ts.VariableStatement) {
	const declaration = node.declarationList.declarations[0];
	const initializer = declaration.initializer;

	if (initializer && (ts.isCallExpression(initializer) || ts.isPropertyAccessExpression(initializer))) {
		let haveCallExpressWithGeneric = false;

		const chain = CollectCallExpressionChain(initializer, (node) => {
			if (!IsCallExpressionWithGeneric(node)) return;
			haveCallExpressWithGeneric = true;
		});

		return !haveCallExpressWithGeneric ? state.Transform(node) : ResolveChain(chain, declaration.name.getText());
	}

	return state.Transform(node);
}
