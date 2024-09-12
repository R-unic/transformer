import ts from "typescript";
import { TSConfig } from "./declarations";
import { f } from "./helpers/factory";
import { TransformState } from "./transformer";

export default function (program: ts.Program, config: TSConfig) {
	return (transformationContext: ts.TransformationContext): ((file: ts.SourceFile) => ts.Node) => {
		f.setFactory(transformationContext.factory);
		const context = new TransformState(program, transformationContext, config);
		return (file) => {
			if (!ts.isSourceFile(file)) {
				console.warn(`Could not transform`);
				return file;
			}
			return context.TransformFile(file);
		};
	};
}
