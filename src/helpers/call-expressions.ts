/* eslint-disable @typescript-eslint/no-explicit-any */
import ts from "typescript";
import { TransformState } from "../transformer";
import { f } from "./factory";
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
	if (path.length === 1) return f.identifier(path[0].getText());

	if (!ts.isIdentifier(path[1])) throw "Cannot resolve access chain";
	let access = f.propertyAccessExpression(path[0], path[1]);
	path.shift();
	path.shift();

	for (let i = 0; i < path.length; i++) {
		if (!ts.isIdentifier(path[i])) throw "Cannot resolve access chain";
		access = f.propertyAccessExpression(access, path[i] as ts.Identifier);
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

		residualPath.unshift(f.identifier(node.name.escapedText.toString()));
	}

	chain.forEach((node, index) => {
		if (ts.isPropertyAccessExpression(node)) {
			path.push(f.identifier(node.name.escapedText.toString()));
			return;
		}

		const newName = `CallResult_${TransformState.Instance.NextID}`;
		const localNodes: ts.Statement[] = [];
		let expression: ts.Expression = lastName
			? f.call(ConvertInAccessPath([f.identifier(lastName), ...path]))
			: node;

		const isLastCallExpress = index === lastCallExpressionIndex;
		if (isLastCallExpress) {
			expression = ConvertInAccessPath([expression, ...residualPath]);
		}

		index < chain.length - 1 && !isLastCallExpress
			? localNodes.push(f.variableStatement(newName, expression))
			: localNodes.push(varriableName ? f.variableStatement(varriableName, expression) : f.statement(expression));

		lastName = newName;
		path = [];

		if (IsCallExpressionWithGeneric(node)) {
			localNodes.unshift(GenerateSetupGenericParameters(node));
		}

		nodes.push(...localNodes);
	});

	return nodes;
}
