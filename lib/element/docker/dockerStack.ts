import {
    SoftwareDeliveryMachineConfiguration,
} from "@atomist/sdm";
import { StackSupport } from "@atomist/sdm-pack-analysis";
import { DockerfileInterpreter } from "./DockerfileInterpreter";
import { dockerScanner } from "./dockerScanner";

export function dockerStack(sdm: SoftwareDeliveryMachineConfiguration): StackSupport {
    return {
        scanners: [dockerScanner],
        interpreters: [new DockerfileInterpreter()],
        transformRecipeContributors: [],
    };
}
