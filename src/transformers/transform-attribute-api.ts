import ts from "typescript";
import { GenerateUID, getDeclaration, getSymbol } from "../helpers";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

const AttributeAPITag = "AttributeAPI";

function GetAttributeUID(state: TransformContext, node: ts.CallExpression) {
	const typeArgument = node.typeArguments?.[0];
	if (!typeArgument || !ts.isTypeQueryNode(typeArgument)) return node;

	const identifier = typeArgument.exprName;
	if (!ts.isIdentifier(identifier)) return node;

	const symbol = state.typeChecker.getSymbolAtLocation(identifier);
	const declaration = getDeclaration(symbol);
	if (!declaration || !ts.isVariableDeclaration(declaration)) return node;

	return GenerateUID(declaration.getSourceFile().fileName, declaration.name.getText());
}

export function GenerateGenericsFromAttributeApi(node: ts.CallExpression) {
	const expression = node.expression;
	if (!ts.isPropertyAccessExpression(expression)) return;

	const typeChecker = TransformContext.Instance.typeChecker;
	const type = typeChecker.getTypeAtLocation(expression);
	const declaration = getDeclaration(getSymbol(type));
	if (!declaration || !ts.isMethodDeclaration(declaration)) return;

	const tags = ts.getJSDocTags(declaration);
	const foundTag = tags.find((tag) => tag.tagName.text === AttributeAPITag);
	if (!foundTag) return;

	const typeArgument = node.typeArguments?.[0];
	if (!typeArgument) return;

	return ReflectionRuntime.SetupGenericParameters([GetAttributeUID(TransformContext.Instance, node)]);
}
