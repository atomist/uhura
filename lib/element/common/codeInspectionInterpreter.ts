import {
    AutoCodeInspection,
    AutoInspectRegistration,
    ReviewListenerRegistration,
    SdmContext,
} from "@atomist/sdm";
import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import {
    CodeInspectionRegisteringInterpreter,
    Interpretation,
} from "@atomist/sdm-pack-analysis";

/**
 * Interpreter that configures the internal code inspection  goal
 */
export class CodeInspectionInterpreter implements CodeInspectionRegisteringInterpreter {

    constructor(private readonly listeners: ReviewListenerRegistration | ReviewListenerRegistration[] = []) {
    }

    get codeInspections(): Array<AutoInspectRegistration<any, any>> {
        return [];
    }

    public configureCodeInspectionGoal(codeInspectionGoal: AutoCodeInspection): void {
        toArray(this.listeners).forEach(l => codeInspectionGoal.withListener(l));
    }

    public async enrich(interpretation: Interpretation, sdmContext: SdmContext): Promise<boolean> {
        return false;
    }
}
