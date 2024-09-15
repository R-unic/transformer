import ts, { NodeArray } from "typescript";
import {
	getDeclaration,
	GetDeclarationName,
	GetDeclarationNameFromType,
	getSymbol,
	getType,
	GetTypeName,
	GetTypeNamespace,
	GetTypeUid,
	IsAnonymousObject,
	IsPrimive,
	IsRobloxInstance,
} from ".";
import { ConditionalType, ConstructorInfo, Method, Parameter, Property, Type } from "../declarations";
import { AccessModifier } from "../enums";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformState } from "../transformer";
import { f } from "./factory";
import { GetRobloxInstanceTypeFromType } from "./get-roblox-instance-type";
import { GetTypeKind } from "./get-type-kind";
import { Logger } from "./logger";

let scheduledType: string | undefined;

function GetReferenceType(type: ts.Type) {
	const symbol = getSymbol(type);
	const declaration = getDeclaration(symbol);

	// this type
	if (type.isTypeParameter() && type.isThisType) {
		const fullName = GetTypeUid(type);
		return ReflectionRuntime.__GetType(fullName, true, []);
	}

	if (type.isTypeParameter()) {
		return ReflectionRuntime.GetGenericParameter(GetDeclarationNameFromType(type));
	}

	if ((declaration || IsPrimive(type)) && !IsAnonymousObject(type)) {
		const typeChecker = TransformState.Instance.typeChecker;
		const typeArguments: Type[] = [];

		if (declaration) {
			typeChecker.getTypeArguments(type as ts.TypeReference).forEach((typeArgument) => {
				typeArguments.push(GetReferenceType(typeArgument));
			});
		}

		const fullName = GetTypeUid(type);
		return ReflectionRuntime.__GetType(
			fullName,
			scheduledType !== undefined && fullName === scheduledType,
			typeArguments,
		);
	}

	return GenerateTypeDescriptionFromNode(type)[0];
}

function GetInterfaces(node?: ts.Node, nodeType?: ts.Type) {
	if (
		node === undefined ||
		nodeType === undefined ||
		(!ts.isClassDeclaration(node) && !ts.isInterfaceDeclaration(node))
	)
		return [];
	if (!node.heritageClauses) return [];

	const heritageClause = node.heritageClauses.find((clause) => {
		if (ts.isInterfaceDeclaration(node)) {
			return clause.token === ts.SyntaxKind.ExtendsKeyword;
		}

		return clause.token === ts.SyntaxKind.ImplementsKeyword;
	});
	if (!heritageClause) return [];

	const typeChecker = TransformState.Instance.typeChecker;
	return heritageClause.types
		.map((node) => {
			const expression = node.expression;
			if (!ts.isIdentifier(expression)) return;

			const expressionType = typeChecker.getTypeAtLocation(expression);
			const declaration = getDeclaration(getSymbol(expressionType));
			if (!declaration) return;

			// Check if interface declared after type
			if (declaration.getSourceFile().fileName === node.getSourceFile().fileName) {
				if (declaration.pos > node.pos) {
					Logger.warn(
						`Interface ${GetTypeUid(expressionType)} is declared after ${GetTypeUid(
							nodeType,
						)}\nType will not have a reference to the interface type`,
					);
				}
			}

			const type = typeChecker.getTypeAtLocation(node);
			return GetReferenceType(type);
		})
		.filter((type) => type !== undefined) as Type[];
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

function HaveUndefined(type: ts.Type) {
	if (type.isUnion()) {
		return type.types.find((typeFromUnion) => typeFromUnion.flags !== ts.TypeFlags.Undefined) !== undefined;
	}

	return false;
}

function GetTypeDescription(type: ts.Type): Type;
function GetTypeDescription(node: ts.Node): Type;
function GetTypeDescription(node: ts.Node | ts.Type) {
	const typeChecker = TransformState.Instance.typeChecker;
	const type = ts.isNode(node as ts.Node) ? typeChecker.getTypeAtLocation(node as ts.Node) : (node as ts.Type);
	return GetReferenceType(type);
}

function GenerateProperty(memberSymbol: ts.Symbol): Property | undefined {
	const declaration = getDeclaration(memberSymbol);
	const type = getType(memberSymbol);
	const optional =
		(memberSymbol.flags & ts.SymbolFlags.Optional) === ts.SymbolFlags.Optional ||
		(declaration &&
			(ts.isPropertyDeclaration(declaration) || ts.isPropertySignature(declaration)) &&
			!!declaration.questionToken) ||
		(type && HaveUndefined(type));

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
	const baseType = (type.getBaseTypes() ?? [])[0] ?? type.getDefault();

	return baseType ? GetReferenceType(baseType) : undefined;
}

function GenerateParameterDescription(symbol: ts.Symbol): Parameter {
	const declaration = getDeclaration(symbol);
	const type = getType(symbol);

	if (!type) {
		throw `Failed to get type of parameter ${symbol.getName()}`;
	}

	return {
		Name: symbol.getName(),
		Optional: declaration ? (declaration as ts.ParameterDeclaration).questionToken !== undefined : false,
		Type: GetTypeDescription(ExcludeUndefined(type)),
	};
}

function GenerateMethodDescription(signature: ts.Signature, symbol: ts.Symbol): Method {
	const methodName = symbol.escapedName.toString();
	const declaration = symbol.valueDeclaration as ts.MethodDeclaration;
	const modifiers = declaration.modifiers;

	if (!declaration) {
		return {
			Name: methodName,
			Parameters: signature.parameters.map((parameter) => GenerateParameterDescription(parameter)),
			ReturnType: GetTypeDescription(ExcludeUndefined(signature.getReturnType())),
			AccessModifier: GetAccessModifier(modifiers),
			IsStatic: false,
			IsAbstract: false,
			Callback: undefined,
		};
	}

	const callback =
		declaration.body === undefined
			? undefined
			: ReflectionRuntime.GetMethodCallback(
					f.identifier(GetDeclarationName(declaration.parent! as ts.Declaration)),
					methodName,
			  );

	if (!modifiers) {
		return {
			Name: methodName,
			Parameters: signature.parameters.map((parameter) => GenerateParameterDescription(parameter)),
			ReturnType: GetTypeDescription(ExcludeUndefined(signature.getReturnType())),
			AccessModifier: GetAccessModifier(modifiers),
			IsStatic: false,
			IsAbstract: false,
			Callback: callback,
		};
	}

	return {
		Name: methodName,
		Parameters: signature.parameters.map((parameter) => GenerateParameterDescription(parameter)),
		ReturnType: GetTypeDescription(ExcludeUndefined(signature.getReturnType())),
		AccessModifier: GetAccessModifier(modifiers),
		IsStatic: modifiers.find((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) !== undefined,
		IsAbstract: modifiers.find((modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword) !== undefined,
		Callback: callback,
	};
}

function GetMethods(type: ts.Type) {
	const typeChecker = TransformState.Instance.typeChecker;
	const members = type.getProperties();

	return members
		.filter(
			(m) =>
				(m.flags & ts.SymbolFlags.Method) === ts.SymbolFlags.Method ||
				(m.flags & ts.SymbolFlags.Function) === ts.SymbolFlags.Function,
		)
		.flatMap((memberSymbol: ts.Symbol) => {
			const declaration = getDeclaration(memberSymbol);

			if (!declaration) {
				return [];
			}

			let type = typeChecker.getTypeOfSymbolAtLocation(memberSymbol, declaration);

			if (type.isUnion()) {
				type = (type.types[0].flags === ts.TypeFlags.Undefined ? type.types[1] : type.types[0]) || type;
			}

			return type.getCallSignatures().map((signature) => GenerateMethodDescription(signature, memberSymbol));
		});
}

function GetConstructor(type: ts.Type): ConstructorInfo | undefined {
	const constructors = type.getConstructSignatures();
	const constructor = constructors.find((signature) => {
		const declaration = signature.declaration;
		if (!declaration || !ts.isConstructorDeclaration(declaration)) return false;

		return declaration.body !== undefined;
	});
	if (!constructor) return;

	const declaration = constructor.declaration as ts.ConstructorDeclaration;

	return {
		Parameters: constructor.parameters.map((parameter) => GenerateParameterDescription(parameter)),
		AccessModifier: GetAccessModifier(declaration.modifiers),
		Callback: ReflectionRuntime.GetConstructorCallback(declaration.parent.name!),
	};
}

function GetReferenseValue(type: ts.Type) {
	const declaration = type.symbol?.valueDeclaration;
	if (!declaration || !ts.isNamedDeclaration(declaration)) return;

	return f.identifier(declaration.name.getText());
}

function GetConstraint(type: ts.Type): Type | undefined {
	const constraint = type.getConstraint();
	if (!type || constraint === undefined || constraint === type) return;

	return GetReferenceType(constraint);
}

function GetConditionalType(type: ts.Type): ConditionalType | undefined {
	if ((type.flags | ts.TypeFlags.Conditional) !== ts.TypeFlags.Conditional) return;

	const typeChecker = TransformState.Instance.typeChecker;
	const ct = (type as ts.ConditionalType).root.node;
	const extendsType = typeChecker.getTypeAtLocation(ct.extendsType);
	const trueType = typeChecker.getTypeAtLocation(ct.trueType);

	return {
		Extends: GetReferenceType(extendsType),
		TrueType: GetReferenceType(trueType),
		FalseType: GetReferenceType(typeChecker.getTypeAtLocation(ct.falseType)),
	};
}

export function GetRobloxInstanceType(type: ts.Type) {
	if (!IsRobloxInstance(type)) return;

	return GetRobloxInstanceTypeFromType(type).symbol.name;
}

function GetTypeParameters(type: ts.Type) {
	const typeChecker = TransformState.Instance.typeChecker;

	const types = typeChecker
		.getTypeArguments(type as ts.TypeReference)
		.map((type) => GenerateTypeDescriptionFromNode(type)[0]);
	return [types, types.map((type) => ReflectionRuntime.GetGenericParameter(type.Name))] as const;
}

export function GenerateTypeDescriptionFromNode(type: ts.Type, schedulingType = false): [Type, Type[]] {
	const declaration = getDeclaration(getSymbol(type));
	const fullName = GetTypeUid(type);
	const [typeParameters, wrappedTypeParameters] = GetTypeParameters(type);

	if (schedulingType) {
		scheduledType = fullName;
	}

	const decscription: Type = {
		Name: GetTypeName(type),
		TypeParameters: wrappedTypeParameters,
		FullName: fullName,
		Assembly: GetTypeNamespace(type),
		Value: GetReferenseValue(type),
		Constructor: GetConstructor(type),
		ConditionalType: GetConditionalType(type),
		BaseType: GetBaseType(type),
		Interfaces: GetInterfaces(declaration, type),
		Properties: GetProperties(type),
		Methods: GetMethods(type),
		Kind: GetTypeKind(type),
		Constraint: GetConstraint(type),
		RobloxInstanceType: GetRobloxInstanceType(type),
	};

	if (schedulingType) {
		scheduledType = undefined;
	}

	return [decscription, typeParameters] as const;
}
