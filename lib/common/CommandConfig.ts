import { CommandRegistration } from "@atomist/sdm";

/**
 * Convenient stuff to pass into a command registration.
 */
export type CommandConfig = Pick<CommandRegistration<any>, "name" | "intent" | "description">;
