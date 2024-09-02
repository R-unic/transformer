import ts, { factory } from "typescript";

export function CreateVarriable(name: string, initializer?: ts.Expression) {
	return factory.createVariableStatement(
		undefined,
		factory.createVariableDeclarationList(
			[factory.createVariableDeclaration(factory.createIdentifier(name), undefined, undefined, initializer)],
			ts.NodeFlags.Const,
		),
	);
}
