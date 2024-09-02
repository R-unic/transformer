/* eslint-disable @typescript-eslint/no-explicit-any */
import ts, { factory } from "typescript";
import { TransformContext } from "../transformer";
import { CreateVarriable } from "./factories";
import { GenerateSetupGenericParameters } from "./generic-helper";

export function IsCallExpressionWithGeneric(node: ts.CallExpression) {
	return node.typeArguments !== undefined;
}

export function CollectCallExpressionChain(
	node: ts.CallExpression | ts.PropertyAccessExpression,
	callback: (node: ts.CallExpression) => void,
) {
	const chain: (ts.CallExpression | ts.PropertyAccessExpression)[] = [node];

	if (ts.isCallExpression(node)) {
		callback(node);
	}

	while (ts.isCallExpression(node.expression) || ts.isPropertyAccessExpression(node.expression)) {
		if (ts.isCallExpression(node.expression)) {
			callback(node.expression);
		}

		chain.unshift(node.expression);
		node = node.expression as ts.CallExpression;
	}

	return chain;
}

function ConvertInAccessPath(path: ts.Expression[]) {
	if (path.length === 1) return factory.createIdentifier(path[0].getText());

	if (!ts.isIdentifier(path[1])) throw "Cannot resolve access chain";
	let access = factory.createPropertyAccessExpression(path[0], path[1]);
	path.shift();
	path.shift();

	for (let i = 0; i < path.length; i++) {
		if (!ts.isIdentifier(path[i])) throw "Cannot resolve access chain";
		access = factory.createPropertyAccessExpression(access, path[i] as ts.Identifier);
	}

	return access;
}

export function ResolveChain(chain: (ts.CallExpression | ts.PropertyAccessExpression)[], varriableName?: string) {
	const nodes: ts.Statement[] = [];
	let lastName: string | undefined = undefined;
	let path: ts.Identifier[] = [];
	const residualPath: ts.Identifier[] = [];
	let lastCallExpressionIndex = -1;

	// Forming residual indexation like a().c.d
	for (let i = chain.length - 1; i >= 0; i--) {
		// There is no residual indexing in the chain
		if (ts.isCallExpression(chain[i]) && i === chain.length - 1) {
			break;
		}

		const node = chain[i];
		if (ts.isCallExpression(node)) {
			lastCallExpressionIndex = i;
			break;
		}

		residualPath.unshift(factory.createIdentifier(node.name.getText()));
	}

	chain.forEach((node, index) => {
		if (ts.isPropertyAccessExpression(node)) {
			path.push(factory.createIdentifier(node.name.getText()));
			return;
		}

		const newName = `CallResult_${TransformContext.Instance.NextID}`;
		const localNodes: ts.Statement[] = [];
		let expression: ts.Expression = lastName
			? factory.createCallExpression(
					ConvertInAccessPath([factory.createIdentifier(lastName), ...path]),
					node.typeArguments,
					node.arguments,
			  )
			: node;

		const isLastCallExpress = index === lastCallExpressionIndex;
		if (isLastCallExpress) {
			expression = ConvertInAccessPath([expression, ...residualPath]);
		}

		index < chain.length - 1 && !isLastCallExpress
			? localNodes.push(CreateVarriable(newName, expression))
			: localNodes.push(
					varriableName
						? CreateVarriable(varriableName, expression)
						: factory.createExpressionStatement(expression),
			  );

		lastName = newName;
		path = [];

		if (IsCallExpressionWithGeneric(node)) {
			localNodes.unshift(GenerateSetupGenericParameters(node));
		}

		nodes.push(...localNodes);
	});

	return nodes;
}
