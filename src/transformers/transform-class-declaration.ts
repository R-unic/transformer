import ts from "typescript";
import { IsCanRegisterType } from "../helpers";
import { PasteNodeInStaticBlock } from "../helpers/factories";
import { f } from "../helpers/factory";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformState } from "../transformer";
import { GenerateTypeDescription } from "../helpers/generate-type-description";

export function VisitClassDeclaration(context: TransformState, node: ts.ClassDeclaration) {
	node = context.Transform(node);
	if (!IsCanRegisterType(node)) return node;

	const typeChecker = TransformState.Instance.typeChecker;
	const typeDescription = GenerateTypeDescription(typeChecker.getTypeAtLocation(node), true);

	return PasteNodeInStaticBlock(node, [
		ReflectionRuntime.RegisterType(typeDescription),
		ReflectionRuntime.RegisterDataType(f.identifier(typeDescription.Name), typeDescription.FullName),
	]);
}
