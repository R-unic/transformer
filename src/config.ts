/* eslint-disable @typescript-eslint/no-explicit-any */
import ts from "typescript";
import { PackageInfo } from "./declarations";

export interface ConfigObject {
	/**
	 * Base absolute path which will be used as root for type full names.
	 */
	rootDir: string;

	/**
	 * Path of tsconfig.json file.
	 */
	tsConfigPath: string;

	/**
	 * Output directory.
	 */
	outDir: string;

	/**
	 * Project directory.
	 * @description It is directory containing tsconfig.json in most cases.
	 */
	projectDir: string;

	/**
	 * Name of the package.
	 */
	packageName: string;
}

export function createConfig(options: ts.CompilerOptions, rootDir: string, packageInfo: PackageInfo): ConfigObject {
	const rawConfigObject = options as any;
	const configPath = rawConfigObject.configFilePath;

	return {
		rootDir: packageInfo.rootDir,
		outDir: options.outDir || rootDir,
		tsConfigPath: configPath,

		projectDir: rootDir,
		packageName: packageInfo.name,
	};
}
