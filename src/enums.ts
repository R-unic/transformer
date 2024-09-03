import ts from "typescript";

export const AccessModifier = {
	[ts.SyntaxKind.PrivateKeyword]: 0,
	[ts.SyntaxKind.ProtectedKeyword]: 1,
	[ts.SyntaxKind.PublicKeyword]: 2,
};

export enum TypeKind {
	Unknown = 0,
	Primitive = 1,
	Interface = 2,
	Class = 3,
	Object = 4,
	TypeParameter = 5,
	Enum = 6,
}
