import ts from "typescript";
import { HaveTag } from "../helpers";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

export function VisitTypeAliasDeclaration(state: TransformContext, node: ts.TypeAliasDeclaration) {
	if (!HaveTag(node, state.projectConfig.Tags.reflect)) return node;

	const typeChecker = TransformContext.Instance.typeChecker;
	const typeDescription = GenerateTypeDescriptionFromNode(typeChecker.getTypeAtLocation(node));

	state.AddNode([ReflectionRuntime.RegisterType(typeDescription)], "before");
	return node;
}
