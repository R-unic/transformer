/* eslint-disable @typescript-eslint/no-unused-vars */
import ts from "typescript";
import { getDeclaration, getSymbol, IsPrimive, IsRobloxInstance } from ".";
import { TypeKind } from "../enums";

const validators: Record<TypeKind, (type: ts.Type) => boolean> = {
	[TypeKind.Unknown]: () => false,
	[TypeKind.Primitive]: (v) => IsPrimive(v),
	[TypeKind.Interface]: (v) => {
		const declaration = getDeclaration(getSymbol(v));
		return declaration !== undefined && ts.isInterfaceDeclaration(declaration);
	},
	[TypeKind.Object]: (type) => {
		const declaration = getDeclaration(getSymbol(type));
		return (
			(declaration !== undefined && ts.isObjectLiteralExpression(declaration)) ||
			(type.flags | ts.TypeFlags.ObjectFlagsType) == ts.TypeFlags.ObjectFlagsType
		);
	},
	[TypeKind.Class]: (v) => {
		const declaration = getDeclaration(getSymbol(v));
		return declaration !== undefined && ts.isClassDeclaration(declaration);
	},
	[TypeKind.TypeParameter]: (v) => v.isTypeParameter(),
	[TypeKind.Enum]: (v) => {
		const declaration = getDeclaration(getSymbol(v));
		return declaration !== undefined && ts.isEnumDeclaration(declaration);
	},
	[TypeKind.Instance]: (v) => IsRobloxInstance(v),
};

export function GetTypeKind(type: ts.Type) {
	let found: TypeKind | undefined;

	for (const [kind, validator] of Object.entries(validators)) {
		if (validator(type)) {
			found = Number(kind) as TypeKind;
		}
	}

	return found;
}
