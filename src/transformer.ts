/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import ts, { ImportDeclaration } from "typescript";
import { ConfigObject, createConfig } from "./config";
import { PackageInfo } from "./declarations";
import { CreateIDGenerator } from "./helpers";
import { LibraryName } from "./project-config.json";
import { Transformers } from "./transformers";

const UnknownPackageName = "@@this";

/**
 * This is the transformer's configuration, the values are passed from the tsconfig.
 */
export interface TransformerConfig {
	_: void;
}

/**
 * This is a utility object to pass around your dependencies.
 *
 * You can also use this object to store state, e.g prereqs.
 */
export class TransformContext {
	public static Instance: TransformContext;
	public readonly factory: ts.NodeFactory;
	public readonly typeChecker: ts.TypeChecker;

	private config!: ConfigObject;
	private importSpecs = new Set<string>();
	private addedNodes: ts.Node[] = [];
	private generator = CreateIDGenerator();

	constructor(
		public program: ts.Program,
		public context: ts.TransformationContext, //public config: TransformerConfig,
	) {
		TransformContext.Instance = this;
		this.typeChecker = program.getTypeChecker();
		this.factory = context.factory;
		this.prepareConfig(program);
	}

	public get NextID() {
		return this.generator();
	}

	public get Config(): ConfigObject {
		return this.config;
	}

	public ClearAddedNodes() {
		this.addedNodes = [];
	}

	public AddNode(node: ts.Node) {
		this.addedNodes.push(node);
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

		const specs = importBindings.elements.map((element) => element.name.getText());
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
						const foundSpec = importBindings.elements.find((element) => element.name.getText() === spec);

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
		const libraryName = `"${LibraryName}"`;

		const index = statements.findIndex((element) => {
			if (!ts.isImportDeclaration(element)) return false;

			return element.moduleSpecifier.getText() === libraryName;
		});

		return index >= 0
			? ([statements[index] as ImportDeclaration, index] as const)
			: ([undefined, undefined] as const);
	}

	public UpdateFile(sourceFile: ts.SourceFile) {
		this.importSpecs.clear();
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
				if (!ts.isStatementOrBlock(node)) {
					return visitNode(this, node);
				}
				const prevNodes = this.addedNodes;
				this.ClearAddedNodes();

				const newNode = visitNode(this, node);
				const newNodes = [...this.addedNodes, ...(Array.isArray(newNode) ? newNode : [newNode])];
				this.ClearAddedNodes();
				this.addedNodes = prevNodes;

				return newNodes;
			},
			this.context,
		);
	}
}

function visitNode(context: TransformContext, node: ts.Node): ts.Node | ts.Node[] {
	const transformer = Transformers.get(node.kind);
	if (transformer) {
		return transformer(context, node);
	}

	return context.Transform(node);
}
