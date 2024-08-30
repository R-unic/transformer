import ts, { NodeArray, PropertyDeclaration, PropertySignature } from "typescript";
import { getTypeFullName } from ".";
import { Property, Type } from "../declarations";
import { AccessModifier } from "../enums";
import { TransformContext } from "../transformer";

function GetInterfaces(node: ts.Node) {
	if (!ts.isClassDeclaration(node)) return [];
	if (!node.heritageClauses) return [];

	const heritageClause = node.heritageClauses.find((clause) => clause.token === ts.SyntaxKind.ImplementsKeyword);
	if (!heritageClause) return [];

	return heritageClause.types.map((node) => {
		return GenerateTypeDescriptionFromNode(node);
	});
}

function GetAccessModifier(modifiers?: NodeArray<ts.ModifierLike>) {
	if (!modifiers) return AccessModifier[ts.SyntaxKind.PublicKeyword];
	const modifier = modifiers?.find(
		(modifier) => AccessModifier[modifier.kind as keyof typeof AccessModifier] !== undefined,
	);
	return AccessModifier[(modifier?.kind as keyof typeof AccessModifier) ?? ts.SyntaxKind.PublicKeyword];
}

function GenerateProperty(propertyNode: PropertyDeclaration | PropertySignature): Property {
	return {
		Name: propertyNode.name?.getText() ?? "",
		Type: GenerateTypeDescriptionFromNode(propertyNode),
		Optional: propertyNode.questionToken !== undefined,
		AccessModifier: GetAccessModifier(propertyNode.modifiers),
		Readonly:
			propertyNode.modifiers?.find((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) !== undefined,
	};
}

function GetProperties(node: ts.Node): Property[] {
	if (!ts.isClassDeclaration(node) && !ts.isInterfaceDeclaration(node)) return [];

	return node.members
		.map((element) => {
			if (ts.isPropertyDeclaration(element) || ts.isPropertySignature(element)) {
				return GenerateProperty(element);
			}
		})
		.filter((element) => element !== undefined) as Property[];
}

export function GenerateTypeDescriptionFromNode(node: ts.Node): Type {
	const typeChecker = TransformContext.Instance.typeChecker;
	const type = typeChecker.getTypeAtLocation(node);
	const fullName = getTypeFullName(type);

	return {
		Name: type.symbol?.name ?? "",
		FullName: fullName,
		Interfaces: GetInterfaces(node),
		Properties: GetProperties(node),
	};
}
