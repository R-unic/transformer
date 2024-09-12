import ts from "typescript";
import { HaveTag } from "../helpers";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformState } from "../transformer";

export function VisitEnumDeclaration(state: TransformState, node: ts.EnumDeclaration) {
	if (!HaveTag(node, state.projectConfig.Tags.reflect)) return node;

	const typeChecker = TransformState.Instance.typeChecker;
	const typeDescription = GenerateTypeDescriptionFromNode(typeChecker.getTypeAtLocation(node), true);

	state.AddNode([ReflectionRuntime.RegisterType(typeDescription)], "after");
	return state.Transform(node);
}
