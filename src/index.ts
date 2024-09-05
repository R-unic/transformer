import ts from "typescript";
import { f } from "./helpers/factory";
import { TransformContext } from "./transformer";

export default function (program: ts.Program) {
	return (transformationContext: ts.TransformationContext): ((file: ts.SourceFile) => ts.Node) => {
		f.setFactory(transformationContext.factory);
		const context = new TransformContext(program, transformationContext);
		return (file) => {
			if (!ts.isSourceFile(file)) {
				console.warn(`Could not transform`);
				return file;
			}
			return context.UpdateFile(file);
		};
	};
}
