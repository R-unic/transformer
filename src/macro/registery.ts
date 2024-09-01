import ts from "typescript";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

function ConvertType(type: ts.Type) {
	const typeDescription = GenerateTypeDescriptionFromNode(type);

	return typeDescription;
}

export function TransformRegistery(node: ts.CallExpression) {
	const typeChecker = TransformContext.Instance.typeChecker;
	const typeArgument = node.typeArguments?.[0];
	if (!typeArgument) return TransformContext.Instance.Transform(node);

	const type = typeChecker.getTypeFromTypeNode(typeArgument);

	if (type.isUnion()) {
		const types = type.types.map((type) => {
			const description = ConvertType(type);
			return { name: description.Name, _type: description };
		});

		return ReflectionRuntime.RegisterTypes(...types);
	}

	const description = ConvertType(type);
	return ReflectionRuntime.RegisterType(description.FullName, description);
}
