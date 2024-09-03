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

export function PasteNodeInStaticBlock(node: ts.ClassDeclaration, nodes: ts.Statement[]) {
	return factory.updateClassDeclaration(node, node.modifiers, node.name, node.typeParameters, node.heritageClauses, [
		factory.createClassStaticBlockDeclaration(factory.createBlock(nodes, true)),
		...node.members,
	]);
}
