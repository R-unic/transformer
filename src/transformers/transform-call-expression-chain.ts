import ts from "typescript";
import { IsReflectSignature as IsReflectCallExpression } from "../helpers";
import { CollectCallExpressionChain, IsCallExpressionWithGeneric, ResolveChain } from "../helpers/call-expressions";
import { TransformContext } from "../transformer";
import { f } from "../helpers/factory";

const VARRIABLE_NAME = "__callExpressionChain";

export function TransformCallExpressionChain(state: TransformContext, node: ts.CallExpression) {
	const typeChecker = state.typeChecker;
	let haveCallExpressWithGeneric = false;
	let identifierName: string | undefined;

	node = state.Transform(node);
	const signature = typeChecker.getResolvedSignature(node);
	if (!signature || !IsReflectCallExpression(signature)) return node;

	const chain = CollectCallExpressionChain(node, (node) => {
		if (!IsCallExpressionWithGeneric(node)) return;
		haveCallExpressWithGeneric = true;
	});

	if (haveCallExpressWithGeneric) {
		identifierName = `${VARRIABLE_NAME}_${state.NextID}`;
		const nodes = ResolveChain(chain, identifierName);
		state.AddNode(nodes);
	}

	return identifierName ? f.identifier(identifierName) : node;
}
