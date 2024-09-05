/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import ts, { ImportDeclaration } from "typescript";
import { ConfigObject, createConfig } from "./config";
import { PackageInfo, TSConfig } from "./declarations";
import { CreateIDGenerator, IsContainerNode } from "./helpers";
import { LibraryName } from "./project-config.json";
import { Transformers } from "./transformers";

const UnknownPackageName = "@@this";

export class TransformContext {
	public static Instance: TransformContext;
	public readonly factory: ts.NodeFactory;
	public readonly typeChecker: ts.TypeChecker;

	private config!: ConfigObject;
	private importSpecs = new Set<string>();
	private addedNodes: { Before: ts.Statement[]; After: ts.Statement[] } = { Before: [], After: [] };
	private generator = CreateIDGenerator();
	private sourceFile!: ts.SourceFile;
	private cachedImport?: [ts.ImportDeclaration, number];

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

	private findImport(statements: ts.NodeArray<ts.Statement>) {
		if (this.cachedImport) return this.cachedImport;
		const libraryName = `"${LibraryName}"`;

		const index = statements.findIndex((element) => {
			if (!ts.isImportDeclaration(element)) return false;

			return element.moduleSpecifier.getText() === libraryName;
		});

		if (index !== -1) {
			this.cachedImport = [statements[index] as ImportDeclaration, index];
		}

		return index >= 0
			? ([statements[index] as ImportDeclaration, index] as const)
			: ([undefined, undefined] as const);
	}

	public UpdateFile(sourceFile: ts.SourceFile) {
		this.importSpecs.clear();
		this.cachedImport = undefined;
		this.sourceFile = sourceFile;
		this.generator = CreateIDGenerator();

		sourceFile = this.Transform(sourceFile);
		if (this.importSpecs.size === 0) return sourceFile;

		const [found, index] = this.findImport(sourceFile.statements);
		const importDeclaration = found ? this.updateImport(found) : this.generateImport();
		const copy = [...sourceFile.statements];

		if (importDeclaration && index !== undefined) {
			copy[index!] = importDeclaration;
		}

		return this.factory.updateSourceFile(
			sourceFile,
			importDeclaration && index !== undefined ? copy : [importDeclaration!, ...sourceFile.statements],
			sourceFile.isDeclarationFile,
			sourceFile.referencedFiles,
			sourceFile.typeReferenceDirectives,
			sourceFile.hasNoDefaultLib,
			sourceFile.libReferenceDirectives,
		);
	}

	public Transform<T extends ts.Node>(node: T): T {
		return ts.visitEachChild(
			node,
			(node) => {
				if (ts.isSourceFile(node)) return visitNode(this, node);

				const parent = node.parent;
				if (!parent || !IsContainerNode(parent)) return visitNode(this, node);

				const prevNodesBefore = this.addedNodes.Before;
				const prevNodesAfter = this.addedNodes.After;
				this.ClearAddedNodes();

				const newNode = visitNode(this, node);
				const newNodes = [...this.addedNodes.Before, newNode, ...this.addedNodes.After];

				this.addedNodes.Before = prevNodesBefore;
				this.addedNodes.After = prevNodesAfter;

				return newNodes.length === 1 ? newNodes[0] : newNodes;
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
