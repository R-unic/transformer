import ts from "typescript";
import {
	ClearDefinedGenerics,
	DefineGenerics,
	GenerateTypeUIDUsingGenerics,
	GenerateUnpackGenerics,
} from "../helpers/generic-helper";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

export function VisitFunctionDeclaration(context: TransformContext, node: ts.FunctionDeclaration) {
	const typeParameters = node.typeParameters;
	if (!typeParameters) return context.Transform(node);

	if (!node.body) return context.Transform(node);
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
		additionalNodes.unshift(ReflectionRuntime.SetupDefaultGenericParameters(defaultParameters));
	}

	let updatedNode = context.Transform(node);
	const block = updatedNode.body!;

	updatedNode = context.factory.updateFunctionDeclaration(
		updatedNode,
		updatedNode.modifiers,
		updatedNode.asteriskToken,
		updatedNode.name,
		updatedNode.typeParameters,
		updatedNode.parameters,
		updatedNode.type,
		context.factory.updateBlock(block, [...additionalNodes, ...block.statements]),
	);

	ClearDefinedGenerics();

	return updatedNode;
}
