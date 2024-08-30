import ts from "typescript";

export const AccessModifier = {
	[ts.SyntaxKind.PrivateKeyword]: 0,
	[ts.SyntaxKind.ProtectedKeyword]: 1,
	[ts.SyntaxKind.PublicKeyword]: 2,
}