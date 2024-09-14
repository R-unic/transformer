import ts from "typescript";
import { IsCanRegisterType } from "../helpers";
import { PasteNodeInStaticBlock } from "../helpers/factories";
import { f } from "../helpers/factory";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformState } from "../transformer";

export function VisitClassDeclaration(context: TransformState, node: ts.ClassDeclaration) {
	node = context.Transform(node);
	if (!IsCanRegisterType(node)) return node;

	const typeChecker = TransformState.Instance.typeChecker;
	const [typeDescription, typeParams] = GenerateTypeDescriptionFromNode(typeChecker.getTypeAtLocation(node), true);

	return PasteNodeInStaticBlock(node, [
		ReflectionRuntime.RegisterType(ReflectionRuntime.DefineGenericParameters(typeParams), typeDescription),
		ReflectionRuntime.RegisterDataType(f.identifier(typeDescription.Name), typeDescription.FullName),
	]);
}
