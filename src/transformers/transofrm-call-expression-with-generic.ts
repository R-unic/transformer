import ts from "typescript";
import { GetTypeUid } from "../helpers";
import { GenerateIndexOfGenerics, GetGenericIndex } from "../helpers/generic-helper";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformState } from "../transformer";

export function TransformCallExpressionWithGeneric(state: TransformState, node: ts.CallExpression) {
	if (!node.typeArguments) return node;

	state.AddNode(
		ReflectionRuntime.SetupGenericParameters(
			node.typeArguments.map((node) => {
				const type = state.typeChecker.getTypeFromTypeNode(node);

				if (type.isTypeParameter()) {
					const index = GetGenericIndex(type);

					if (index !== undefined) {
						return GenerateIndexOfGenerics(index);
					}
				}

				return GetTypeUid(type);
			}),
		),
	);

	return node;
}
