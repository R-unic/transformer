import ts, { ConstructorDeclaration, factory, MethodDeclaration, MethodSignature, NodeArray } from "typescript";
import { getDeclaration, getSymbol, getType, GetTypeName, GetTypeNamespace, GetTypeUid } from ".";
import { ConstructorInfo, Method, Parameter, Property, Type } from "../declarations";
import { AccessModifier } from "../enums";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";
import { GetTypeKind } from "./get-type-kind";

function GetReferenceType(type: ts.Type) {
	const symbol = getSymbol(type);
	const declaration = getDeclaration(symbol);

	if (!declaration || !ts.isTypeLiteralNode(declaration)) {
		const fullName = GetTypeUid(type);
		return ReflectionRuntime.__GetType(fullName);
	}

	return GenerateTypeDescriptionFromNode(type);
}

function GetInterfaces(node?: ts.Node) {
	if (node === undefined || (!ts.isClassDeclaration(node) && !ts.isInterfaceDeclaration(node))) return [];

	if (!node.heritageClauses) return [];

	const heritageClause = node.heritageClauses.find((clause) => {
		if (ts.isInterfaceDeclaration(node)) {
			return clause.token === ts.SyntaxKind.ExtendsKeyword;
		}

		return clause.token === ts.SyntaxKind.ImplementsKeyword;
	});
	if (!heritageClause) return [];

	const typeChecker = TransformContext.Instance.typeChecker;
	return heritageClause.types.map((node) => {
		const type = typeChecker.getTypeAtLocation(node);
		return GetReferenceType(type);
	});
}

function GetAccessModifier(modifiers?: NodeArray<ts.ModifierLike>) {
	if (!modifiers) return AccessModifier[ts.SyntaxKind.PublicKeyword];
	const modifier = modifiers?.find(
		(modifier) => AccessModifier[modifier.kind as keyof typeof AccessModifier] !== undefined,
	);
	return AccessModifier[(modifier?.kind as keyof typeof AccessModifier) ?? ts.SyntaxKind.PublicKeyword];
}

function ExcludeUndefined(type: ts.Type) {
	if (type.isUnion()) {
		// Determine if the type have `type | undefined`
		const types = type.types.filter((typeFromUnion) => typeFromUnion.flags !== ts.TypeFlags.Undefined);
		if (types.length === 1) {
			type = types[0];
		}
	}

	return type;
}

function GetTypeDescription(type: ts.Type): Type;
function GetTypeDescription(node: ts.Node): Type;
function GetTypeDescription(node: ts.Node | ts.Type) {
	const typeChecker = TransformContext.Instance.typeChecker;
	const type = ts.isNode(node as ts.Node) ? typeChecker.getTypeAtLocation(node as ts.Node) : (node as ts.Type);
	return GetReferenceType(type);
}

function GenerateProperty(memberSymbol: ts.Symbol): Property | undefined {
	const declaration = getDeclaration(memberSymbol);
	const optional =
		(memberSymbol.flags & ts.SymbolFlags.Optional) === ts.SymbolFlags.Optional ||
		(declaration &&
			(ts.isPropertyDeclaration(declaration) || ts.isPropertySignature(declaration)) &&
			!!declaration.questionToken);

	const type = getType(memberSymbol);
	if (!type || !declaration || (!ts.isPropertySignature(declaration) && !ts.isPropertyDeclaration(declaration)))
		return;

	return {
		Name: memberSymbol.escapedName.toString(),
		Type: GetTypeDescription(ExcludeUndefined(type)),
		Optional: optional ?? false,
		AccessModifier: GetAccessModifier(declaration.modifiers),
		Readonly:
			declaration.modifiers?.find((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) !== undefined,
	};
}

function GetProperties(type: ts.Type): Property[] {
	return type
		.getProperties()
		.filter(
			(m) =>
				(m.flags & ts.SymbolFlags.Property) === ts.SymbolFlags.Property ||
				(m.flags & ts.SymbolFlags.GetAccessor) === ts.SymbolFlags.GetAccessor ||
				(m.flags & ts.SymbolFlags.SetAccessor) === ts.SymbolFlags.SetAccessor,
		)
		.map((memberSymbol) => GenerateProperty(memberSymbol))
		.filter((property) => !!property) as Property[];
}

function GetBaseType(type: ts.Type) {
	const baseType = (type.getBaseTypes() ?? [])[0];
	return baseType ? ReflectionRuntime.__GetType(GetTypeUid(baseType)) : undefined;
}

function GenerateParameterDescription(parameter: ts.ParameterDeclaration): Parameter {
	const typeChecker = TransformContext.Instance.typeChecker;

	if (!parameter.type) throw new Error(`Could not find type for ${parameter.name.getText()}`);
	const type = typeChecker.getTypeFromTypeNode(parameter.type);

	return {
		Name: parameter.name.getText(),
		Optional: parameter.questionToken !== undefined,
		Type: GetTypeDescription(ExcludeUndefined(type)),
	};
}

function GenerateMethodDescription(method: ts.MethodDeclaration | ts.MethodSignature, ctor: ts.Declaration): Method {
	const typeChecker = TransformContext.Instance.typeChecker;
	const signature = typeChecker.getSignatureFromDeclaration(method);
	const methodName = method.name.getText();
	if (!signature) throw new Error(`Could not find signature for ${method.name.getText()}`);

	const ctorSymbol = getSymbol(typeChecker.getTypeAtLocation(ctor));
	const isInterface = ts.isInterfaceDeclaration(ctor);

	return {
		Name: methodName,
		Parameters: method.parameters.map((parameter) => GenerateParameterDescription(parameter)),
		ReturnType: GetTypeDescription(ExcludeUndefined(signature.getReturnType())),
		AccessModifier: GetAccessModifier(method.modifiers),
		IsStatic: method.modifiers?.find((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) !== undefined,
		IsAbstract: method.modifiers?.find((modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword) !== undefined,
		Callback: isInterface
			? undefined
			: ReflectionRuntime.GetMethodCallback(
					factory.createIdentifier(ctorSymbol.escapedName.toString()),
					methodName,
			  ),
	};
}

function GetMethods(node?: ts.Node) {
	if (node === undefined || (!ts.isClassDeclaration(node) && !ts.isInterfaceDeclaration(node))) return [];

	const methodDeclarations = node.members.filter((v) => ts.isMethodDeclaration(v) || ts.isMethodSignature(v)) as (
		| MethodDeclaration
		| MethodSignature
	)[];
	return methodDeclarations.map((v) => GenerateMethodDescription(v, node));
}

function GetConstructor(node?: ts.Node): ConstructorInfo | undefined {
	if (node === undefined || !ts.isClassDeclaration(node)) return;

	const constructor = node.members.find((member) => ts.isConstructorDeclaration(member)) as ConstructorDeclaration;
	if (!constructor) return;

	return {
		Parameters: constructor.parameters.map((parameter) => GenerateParameterDescription(parameter)),
		AccessModifier: GetAccessModifier(constructor.modifiers),
		Callback: ReflectionRuntime.GetConstructorCallback(factory.createIdentifier(node.name!.getText())),
	};
}

function GetReferenseValue(type: ts.Type) {
	const declaration = type.symbol?.valueDeclaration;
	if (!declaration) return;

	return factory.createIdentifier(type.symbol.escapedName.toString());
}

export function GenerateTypeDescriptionFromNode(type: ts.Type): Type {
	const declaration = getDeclaration(getSymbol(type));
	const fullName = GetTypeUid(type);

	return {
		Name: GetTypeName(type),
		FullName: fullName,
		Namespace: GetTypeNamespace(type),
		Value: GetReferenseValue(type),
		Constructor: GetConstructor(declaration),
		BaseType: GetBaseType(type),
		Interfaces: GetInterfaces(declaration),
		Properties: GetProperties(type),
		Methods: GetMethods(declaration),
		Kind: GetTypeKind(type),
	};
}
