import ts from "typescript";
import { getTypeFullName } from ".";
import { Type } from "../reflect-runtime/types";
import { TransformContext } from "../transformer";

function GetInterfaces(node: ts.Node) {
	if (!ts.isClassDeclaration(node)) return [];
	if (!node.heritageClauses) return [];

	const heritageClause = node.heritageClauses.find((clause) => clause.token === ts.SyntaxKind.ImplementsKeyword);
	if (!heritageClause) return [];

	return heritageClause.types.map((node) => GenerateTypeDescriptionFromNode(node));
}

export function GenerateTypeDescriptionFromNode(node: ts.Node): Type {
	const typeChecker = TransformContext.Instance.typeChecker;
	const type = typeChecker.getTypeAtLocation(node);
	const fullName = getTypeFullName(type);
	const interfaces = GetInterfaces(node);

	return {
		Name: type.symbol.name ?? "",
		FullName: fullName,
		Interfaces: interfaces,
		Properties: new Map(),
	};
}
