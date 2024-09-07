/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import ts, { ImportDeclaration, NodeArray } from "typescript";
import { ConfigObject, createConfig } from "./config";
import { PackageInfo, TSConfig } from "./declarations";
import { CreateIDGenerator, HaveTag } from "./helpers";
import { f } from "./helpers/factory";
import { LibraryName, Tags } from "./project-config.json";
import * as projectConfig from "./project-config.json";
import { Transformers } from "./transformers";

const UnknownPackageName = "@@this";

export class TransformContext {
	public static Instance: TransformContext;
	public readonly factory: ts.NodeFactory;
	public readonly typeChecker: ts.TypeChecker;
	public readonly projectConfig = projectConfig;

	private config!: ConfigObject;
	private importSpecs = new Set<string>();
	private addedNodes: { Before: ts.Statement[]; After: ts.Statement[] } = { Before: [], After: [] };
	private generator = CreateIDGenerator();
	private sourceFile!: ts.SourceFile;
	private cachedImport?: [ts.ImportDeclaration, number];
	private isEnableGlobalReflect = false;
	private isDisabledReflect = false;
	private isDisabledRegister = false;

	constructor(public program: ts.Program, public context: ts.TransformationContext, public tsConfig: TSConfig) {
		TransformContext.Instance = this;
		this.setupDefaultTSconfigParams();

		this.typeChecker = program.getTypeChecker();
		this.factory = context.factory;
		this.prepareConfig(program);
	}

	private setupDefaultTSconfigParams() {
		this.tsConfig.autoRegister ??= true;
		this.tsConfig.reflectAllCalls ??= false;
	}

	public get IsDisabledRegister() {
		return this.isDisabledRegister;
	}

	public get IsEnableGlobalReflect() {
		return this.isEnableGlobalReflect;
	}

	public get IsDisabledReflect() {
		return this.isDisabledReflect;
	}

	public get NextID() {
		return this.generator();
	}

	public get Config(): ConfigObject {
		return this.config;
	}

	public get BlockContext() {
		return this.addedNodes as { Before: ReadonlyArray<ts.Statement>; After: ReadonlyArray<ts.Statement> };
	}

	public OverrideBlockContext() {
		const prevNodesBefore = this.addedNodes.Before;
		const prevNodesAfter = this.addedNodes.After;
		this.ClearAddedNodes();

		return () => {
			this.addedNodes.Before = prevNodesBefore;
			this.addedNodes.After = prevNodesAfter;
		};
	}

	public ClearAddedNodes() {
		this.addedNodes.After = [];
		this.addedNodes.Before = [];
	}

	public AddNode(node: ts.Statement | ts.Statement[], place: "before" | "after" = "before") {
		if (place === "before") {
			this.addedNodes.Before.push(...(Array.isArray(node) ? node : [node]));
			return;
		}

		this.addedNodes.After.push(...(Array.isArray(node) ? node : [node]));
	}

	public HaveImported(name: string) {
		if (this.importSpecs.has(name)) return true;

		const [importDecl] = this.findImport(this.sourceFile.statements);
		if (!importDecl) return false;

		const importBindings = importDecl.importClause?.namedBindings;
		if (!importBindings || !ts.isNamedImports(importBindings)) return false;

		return importBindings.elements.find((element) => element.name.escapedText.toString() === name) !== undefined;
	}

	private getPackage(root: string, recursiveCheck: boolean = false): PackageInfo {
		try {
			const packageJson = fs.readFileSync(path.join(root, "package.json"), "utf-8");
			return { rootDir: root, name: JSON.parse(packageJson).name || UnknownPackageName };
		} catch (e) {
			if (path.parse(root).root == root) {
				// as any -> internal
				return { rootDir: undefined as any, name: UnknownPackageName };
			}

			// Try to get parent folder package
			const packageInfo = this.getPackage(path.normalize(path.join(root, "..")), true);

			if (packageInfo.rootDir == undefined) {
				// If this is recursive check, return undefined root as received from parent folder check
				if (recursiveCheck) {
					return packageInfo;
				}

				// This is top level check; return original root passed as argument
				return { rootDir: root, name: packageInfo.name };
			}

			return packageInfo;
		}
	}

	private prepareConfig(program: ts.Program) {
		const rootDir = path.resolve(program.getCurrentDirectory());
		const packageInfo = this.getPackage(rootDir);
		this.config = createConfig(program.getCompilerOptions(), rootDir, packageInfo);
	}

	public AddImportDeclaration(path: string) {
		this.importSpecs.add(path);
	}

	private generateImport() {
		if (this.importSpecs.size === 0) return undefined;

		return this.factory.createImportDeclaration(
			undefined,
			this.factory.createImportClause(
				false,
				undefined,
				this.factory.createNamedImports(
					Array.from(this.importSpecs).map((spec) =>
						this.factory.createImportSpecifier(false, undefined, this.factory.createIdentifier(spec)),
					),
				),
			),
			this.factory.createStringLiteral(LibraryName),
			undefined,
		);
	}

	private updateImport(node: ImportDeclaration) {
		const importBindings = node.importClause?.namedBindings;
		if (!importBindings || !ts.isNamedImports(importBindings)) return;

		const specs = importBindings.elements.map((element) => element.name.escapedText.toString());
		const finallySpecs = new Set([...new Set(specs), ...this.importSpecs]);

		return this.factory.updateImportDeclaration(
			node,
			node.modifiers,
			this.factory.updateImportClause(
				node.importClause,
				node.importClause.isTypeOnly,
				node.importClause.name,
				this.factory.updateNamedImports(
					importBindings,
					Array.from(finallySpecs).map((spec) => {
						const foundSpec = importBindings.elements.find(
							(element) => element.name.escapedText.toString() === spec,
						);

						return this.factory.createImportSpecifier(
							foundSpec?.isTypeOnly ?? false,
							foundSpec?.propertyName,
							this.factory.createIdentifier(spec),
						);
					}),
				),
			),
			node.moduleSpecifier,
			node.assertClause,
		);
	}

	private findImport(statements: ts.NodeArray<ts.Statement> | ts.Statement[]) {
		if (this.cachedImport) return this.cachedImport;

		const index = statements.findIndex((element) => {
			if (!ts.isImportDeclaration(element)) return false;
			if (!ts.isStringLiteral(element.moduleSpecifier)) return this.factory;

			return element.moduleSpecifier.text === LibraryName;
		});

		if (index !== -1) {
			this.cachedImport = [statements[index] as ImportDeclaration, index];
		}

		return index >= 0
			? ([statements[index] as ImportDeclaration, index] as const)
			: ([undefined, undefined] as const);
	}

	private transformStatementList(
		statements: NodeArray<ts.Statement>,
		parent: ts.Node,
		callback?: (node: ts.Node) => void,
	) {
		const result: ts.Statement[] = [];

		statements.forEach((statement) => {
			const clearContext = this.OverrideBlockContext();
			const newNode = visitNode(this, statement) as ts.Statement;
			callback?.(newNode);

			const newNodes = [...this.addedNodes.Before, newNode, ...this.addedNodes.After];

			newNodes.forEach((node) => {
				(node.parent as ts.Node) = parent;
				result.push(node);
			});

			clearContext();
		});

		return result;
	}

	public TransformFile(sourceFile: ts.SourceFile) {
		this.importSpecs.clear();
		this.cachedImport = undefined;
		this.sourceFile = sourceFile;
		this.isEnableGlobalReflect = false;
		this.isDisabledReflect = false;
		this.isDisabledRegister = false;
		this.generator = CreateIDGenerator();

		const firstStatement = sourceFile.statements[0];
		if (firstStatement && firstStatement.parent === undefined) {
			(firstStatement.parent as ts.SourceFile) = sourceFile;
		}

		const statements = this.transformStatementList(sourceFile.statements, sourceFile, (node) => {
			if (HaveTag(node, Tags.globalReflect)) {
				this.isEnableGlobalReflect = true;
			}

			if (HaveTag(node, Tags.nonReflect)) {
				this.isDisabledReflect = true;
			}

			if (HaveTag(node, Tags.nonRegister)) {
				this.isDisabledRegister = true;
			}
		});

		// Update imports
		let isNewImport = false;

		if (this.importSpecs.size !== 0) {
			const [found, index] = this.findImport(statements);
			const importDeclaration = found ? this.updateImport(found) : this.generateImport();

			if (importDeclaration && index !== undefined) {
				statements[index!] = importDeclaration;
			}

			if (importDeclaration && index === undefined) {
				isNewImport = true;
				statements.unshift(importDeclaration);
			}
		}

		if (firstStatement && statements[0] && isNewImport) {
			const original = ts.getParseTreeNode(firstStatement);

			ts.moveSyntheticComments(statements[0], firstStatement);

			if (original) {
				ts.copyComments(original, statements[0]);
				ts.removeAllComments(original);
			}
		}

		return f.update.sourceFile(sourceFile, this.factory.createNodeArray(statements));
	}

	public Transform<T extends ts.Node>(node: T): T {
		return ts.visitEachChild(
			node,
			(child) => {
				if (!ts.isBlock(child)) return visitNode(this, child);

				const newStatements = this.transformStatementList(child.statements, child);
				return this.factory.updateBlock(child, newStatements);
			},
			this.context,
		);
	}
}

function visitNode(context: TransformContext, node: ts.Node): ts.Node {
	const transformer = Transformers.get(node.kind);
	if (transformer) {
		return transformer(context, node);
	}

	return context.Transform(node);
}
