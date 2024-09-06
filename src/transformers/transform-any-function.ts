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
import { TransformContext } from "../transformer";

export function TransformAnyFunction<T extends ts.FunctionLikeDeclarationBase>(state: TransformContext, node: T) {
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

	const restoreContext = state.OverrideBlockContext();
	const updatedNode = state.Transform(node);
	const nodesFromContext = state.BlockContext;

	let body = updatedNode.body;
	ClearDefinedGenerics();

	if (updatedNode === node && !isReflectSignature) return undefined;

	if (body && ts.isBlock(body)) {
		body = state.factory.updateBlock(body, [...additionalNodes, ...body.statements]);
	}

	if (body && !ts.isBlock(body)) {
		body = state.factory.createBlock(
			[...additionalNodes, ...nodesFromContext.Before, f.returnStatement(body)],
			true,
		);
	}

	restoreContext();
	return [updatedNode, body] as const;
}
