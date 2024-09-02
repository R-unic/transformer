import ts, { factory } from "typescript";
import { CollectCallExpressionChain, IsCallExpressionWithGeneric, ResolveChain } from "../helpers/call-expressions";
import { TransformContext } from "../transformer";

const VARRIABLE_NAME = "__callExpressionChain";

export function TransformCallExpressionChain(state: TransformContext, node: ts.CallExpression) {
	let haveCallExpressWithGeneric = false;
	let identifierName: string | undefined;
	node = state.Transform(node);

	const chain = CollectCallExpressionChain(node, (node) => {
		if (!IsCallExpressionWithGeneric(node)) return;
		haveCallExpressWithGeneric = true;
	});

	if (haveCallExpressWithGeneric) {
		identifierName = `${VARRIABLE_NAME}_${state.NextID}`;
		const nodes = ResolveChain(chain, identifierName);
		state.AddNode(nodes);
	}

	return identifierName ? factory.createIdentifier(identifierName) : state.Transform(node);
}
