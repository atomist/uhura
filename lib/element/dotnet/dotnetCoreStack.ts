import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm";
import { StackSupport } from "@atomist/sdm-pack-analysis";
import { DotnetCoreInterpreter } from "./DotnetCoreInterpreter";
import { dotnetCoreScanner } from "./dotnetCoreScanner";
import { DotnetCoreTransformRecipeContributor } from "./dotnetCoreTransforms";

/**
 * StackSupport for .NET Core
 */
export function dotnetCoreStack(sdm: SoftwareDeliveryMachineConfiguration): StackSupport {
    return {
        scanners: [dotnetCoreScanner],
        interpreters: [new DotnetCoreInterpreter()],
        transformRecipeContributors: [{
            originator: "dotnetcore",
            optional: false,
            contributor: new DotnetCoreTransformRecipeContributor(),
        }],
    };
}
