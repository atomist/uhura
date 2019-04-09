import {
    Project,
    projectUtils,
} from "@atomist/automation-client";
import {
    CodeTransform,
    SdmContext,
} from "@atomist/sdm";
import {
    ProjectAnalysis,
    TransformRecipe,
    TransformRecipeContributor,
} from "@atomist/sdm-pack-analysis";
import { DotnetCoreProjectFileGlob } from "./dotnetCoreScanner";

/**
 * TransformRecipeContributor for .NET Core applications created via universalGenerator
 */
export class DotnetCoreTransformRecipeContributor implements TransformRecipeContributor {

    public async analyze(p: Project, analysis: ProjectAnalysis, sdmContext: SdmContext): Promise<TransformRecipe | undefined> {
        if (!analysis.elements.dotnetcore) {
            return undefined;
        }

        return {
            parameters: [],
            transforms: [DotnetCoreProjectFileCodeTransform],
        };
    }
}

/**
 * CodeTransform to update the name of the .csproj file in the root of the project
 */
const DotnetCoreProjectFileCodeTransform: CodeTransform = async p => {
    const csprojFiles = await projectUtils.gatherFromFiles(p, DotnetCoreProjectFileGlob, async f => f);
    if (!!csprojFiles && csprojFiles.length === 1) {
        await p.moveFile(csprojFiles[0].path, `${p.name}.csproj`);
    }
    return p;
};
