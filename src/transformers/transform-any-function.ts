import ts, { factory } from "typescript";
import {
	ClearDefinedGenerics,
	DefineGenerics,
	GenerateTypeUIDUsingGenerics,
	GenerateUnpackGenerics,
	GENERICS_ARRAY,
} from "../helpers/generic-helper";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

export function TransformAnyFunction<T extends ts.FunctionLikeDeclarationBase>(context: TransformContext, node: T) {
	const typeParameters = node.typeParameters;
	if (!typeParameters) return undefined;

	const unpackStatement = GenerateUnpackGenerics(context.factory);

	DefineGenerics(
		typeParameters.map((typeParameter) => {
			return context.typeChecker.getTypeAtLocation(typeParameter);
		}),
	);

	const additionalNodes: ts.Statement[] = [unpackStatement];
	const defaultParameters: [number, ts.Expression][] = [];

	typeParameters.forEach((typeParameter, index) => {
		if (!typeParameter.default) return;

		const type = context.typeChecker.getTypeFromTypeNode(typeParameter.default);
		defaultParameters.push([index, GenerateTypeUIDUsingGenerics(type)]);
	});

	if (defaultParameters.length > 0) {
		additionalNodes.push(
			ReflectionRuntime.SetupDefaultGenericParameters(
				factory.createIdentifier(GENERICS_ARRAY),
				defaultParameters,
			),
		);
	}

	const updatedNode = context.Transform(node);
	let block = updatedNode.body;
	ClearDefinedGenerics();

	if (block && ts.isBlock(block)) {
		block = context.factory.updateBlock(block, [...additionalNodes, ...block.statements]);
	}

	if (block && !ts.isBlock(block)) {
		block = context.factory.createBlock([...additionalNodes, factory.createReturnStatement(block)], true);
	}

	if (!block) {
		block = context.factory.createBlock([...additionalNodes], true);
	}

	return [updatedNode, block] as const;
}
