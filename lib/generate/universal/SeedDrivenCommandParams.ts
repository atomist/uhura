import { BaseParameter } from "@atomist/automation-client";
import { CommandConfig } from "../../common/CommandConfig";

export interface SeedDrivenCommandParams {

    /**
     * URL of seed repo.
     */
    seedUrl: string;
}

export type SeedDrivenCommandConfig = CommandConfig & { seedParameter: BaseParameter };
