/* eslint-disable @typescript-eslint/no-unused-vars */
import ts from "typescript";
import { TypeKind } from "../enums";
import { getDeclaration, getSymbol, IsPrimive } from ".";

const validators: Record<TypeKind, (type: ts.Type) => boolean> = {
	[TypeKind.Unknown]: () => false,
	[TypeKind.Primitive]: (v) => IsPrimive(v),
	[TypeKind.Interface]: (v) => {
		const declaration = getDeclaration(getSymbol(v));
		return declaration !== undefined && ts.isInterfaceDeclaration(declaration);
	},
	[TypeKind.Object]: (v) => {
		const declaration = getDeclaration(getSymbol(v));
		return declaration !== undefined && ts.isObjectLiteralExpression(declaration);
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
};

export function GetTypeKind(type: ts.Type) {
	for (const [kind, validator] of Object.entries(validators)) {
		if (validator(type)) return Number(kind) as TypeKind;
	}
}
