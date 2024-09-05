import ts from "typescript";
import { f } from "./factory";

export function PasteNodeInStaticBlock(node: ts.ClassDeclaration, nodes: ts.Statement[]) {
	return f.update.classDeclaration(node, undefined, [f.staticBlockDeclaration(nodes), ...node.members]);
}
