import ts from "typescript";
import { IsReflectSignature } from "../helpers";
import { f } from "../helpers/factory";
import {
	ClearDefinedGenerics,
	DefineGenerics,
	GenerateTypeUIDUsingGenerics,
	GenerateUnpackGenerics,
	GENERICS_ARRAY,
} from "../helpers/generic-helper";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformState, VisitNode } from "../transformer";

export function TransformAnyFunction<T extends ts.FunctionLikeDeclarationBase>(state: TransformState, node: T) {
	const typeParameters = node.typeParameters;
	const isReflectSignature = IsReflectSignature(node);

	const additionalNodes: ts.Statement[] = [];
	const defaultParameters: [number, ts.Expression][] = [];

	if (typeParameters && isReflectSignature) {
		additionalNodes.push(GenerateUnpackGenerics(state.factory));
		DefineGenerics(
			typeParameters.map((typeParameter) => {
				return state.typeChecker.getTypeAtLocation(typeParameter);
			}),
		);

		typeParameters.forEach((typeParameter, index) => {
			if (!typeParameter.default) return;

			const type = state.typeChecker.getTypeFromTypeNode(typeParameter.default);
			defaultParameters.push([index, GenerateTypeUIDUsingGenerics(type)]);
		});
	}

	if (defaultParameters.length > 0) {
		additionalNodes.push(
			ReflectionRuntime.SetupDefaultGenericParameters(f.identifier(GENERICS_ARRAY), defaultParameters),
		);
	}

	let returnedModifiers: ts.ModifierLike[] | undefined;

	if (ts.isMethodDeclaration(node) && node.modifiers) {
		returnedModifiers = [];

		node.modifiers.forEach((modifier) => {
			returnedModifiers!.push(VisitNode(state, modifier) as ts.ModifierLike);
		});
	}

	let body = node.body && ts.isBlock(node.body) ? (state.VisitBlock(node.body) as ts.Block) : node.body;

	if (body && ts.isBlock(body)) {
		body = state.factory.updateBlock(body, [...additionalNodes, ...body.statements]);
	}

	ClearDefinedGenerics();

	if (body === node.body && !isReflectSignature) return;
	if (body && !ts.isBlock(body)) {
		const restoreContext = state.OverrideBlockContext();
		const updatedNode = VisitNode(state, body) as ts.Expression;

		body = state.factory.createBlock(
			[
				...additionalNodes,
				...state.BlockContext.Before,
				...state.BlockContext.After,
				f.returnStatement(updatedNode),
			],
			true,
		);

		restoreContext();
	}

	return [body, returnedModifiers] as const;
}
