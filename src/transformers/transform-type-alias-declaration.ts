import ts from "typescript";
import { HaveTag } from "../helpers";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformState } from "../transformer";

export function VisitTypeAliasDeclaration(state: TransformState, node: ts.TypeAliasDeclaration) {
	if (!HaveTag(node, state.projectConfig.Tags.reflect)) return node;

	const typeChecker = TransformState.Instance.typeChecker;
	const [typeDescription, typeParams] = GenerateTypeDescriptionFromNode(typeChecker.getTypeAtLocation(node), true);

	state.AddNode(
		[ReflectionRuntime.RegisterType(ReflectionRuntime.DefineGenericParameters(typeParams), typeDescription)],
		"before",
	);
	return node;
}
